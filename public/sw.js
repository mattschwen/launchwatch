// Service Worker for LaunchWatch PWA
const CACHE_NAME = 'launchwatch-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  // Force waiting service worker to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip caching for POST requests (API calls)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        event.waitUntil(
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response.clone());
              });
            }
          }).catch(() => {
            // Silently fail background updates
          })
        );
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cache successful responses (GET only)
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Network failed, return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

// Background sync for notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-launches') {
    event.waitUntil(syncLaunches());
  }
});

async function syncLaunches() {
  try {
    // Fetch latest launch data
    const response = await fetch('/api/launches');
    const launches = await response.json();

    // Check for upcoming launches and send notifications
    const now = Date.now();
    launches.forEach((launch) => {
      const launchTime = new Date(launch.date).getTime();
      const timeUntilLaunch = launchTime - now;

      // Notify for launches in 1 hour
      if (timeUntilLaunch > 0 && timeUntilLaunch <= 60 * 60 * 1000) {
        self.registration.showNotification('🚀 Launch Alert!', {
          body: `${launch.name} launching in ${Math.floor(timeUntilLaunch / 60000)} minutes`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `launch-${launch.id}`,
          data: { launchId: launch.id },
        });
      }
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New rocket launch update!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'view', title: 'View Launch' },
      { action: 'close', title: 'Close' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LaunchWatch', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});
