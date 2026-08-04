const CACHE_PREFIX = 'launchwatch-';
const CACHE_VERSION = 'v7';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const MAX_STATIC_ENTRIES = 96;

const SHELL_ASSETS = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/badge-96.png',
];
const SHELL_ASSET_PATHS = new Set(SHELL_ASSETS);

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isFrameworkDataRequest(request, url) {
  return (
    url.searchParams.has('_rsc') ||
    request.headers.has('RSC') ||
    request.headers.has('Next-Router-Prefetch') ||
    request.headers.has('Next-Router-State-Tree') ||
    request.headers.get('Accept')?.includes('text/x-component')
  );
}

function isImmutableNextAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

function hasOnlyDeploymentIdQuery(url) {
  const keys = [...url.searchParams.keys()];
  return (
    keys.length === 1 &&
    keys[0] === 'dpl' &&
    Boolean(url.searchParams.get('dpl'))
  );
}

function isCacheableImmutableAsset(url) {
  return (
    isImmutableNextAsset(url) &&
    (url.search === '' || hasOnlyDeploymentIdQuery(url))
  );
}

function isExplicitShellAsset(url) {
  return url.search === '' && SHELL_ASSET_PATHS.has(url.pathname);
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE })) || Response.error();
  }
}

async function cacheFirstShellAsset(request) {
  const cachedResponse = await caches.match(request, { cacheName: SHELL_CACHE });
  return cachedResponse || fetch(request);
}

async function trimStaticCache(cache) {
  const cachedRequests = await cache.keys();
  const overflow = cachedRequests.length - MAX_STATIC_ENTRIES;

  if (overflow <= 0) {
    return;
  }

  await Promise.all(
    cachedRequests.slice(0, overflow).map((cachedRequest) => cache.delete(cachedRequest))
  );
}

async function cacheFirstImmutableAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok && networkResponse.type === 'basic') {
    await cache.put(request, networkResponse.clone());
    await trimStaticCache(cache);
  }

  return networkResponse;
}

function cleanPushText(value, fallback, maxLength) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function normalizePushPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
}

function safeNotificationUrl(value) {
  if (typeof value !== 'string') {
    return self.location.origin;
  }

  try {
    const destination = new URL(value, self.location.origin);
    return destination.origin === self.location.origin
      ? destination.href
      : self.location.origin;
  } catch {
    return self.location.origin;
  }
}

async function openNotificationDestination(safeUrl) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  const exactClient = clients.find((client) => client.url === safeUrl);

  if (exactClient) {
    try {
      return await exactClient.focus();
    } catch {
      return self.clients.openWindow(safeUrl);
    }
  }

  const reusableClient = clients.find((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  if (reusableClient && typeof reusableClient.navigate === 'function') {
    try {
      const destinationClient = await reusableClient.navigate(safeUrl);
      if (destinationClient) {
        return await destinationClient.focus();
      }
    } catch {
      // A client can disappear between discovery and navigation.
    }
  }

  return self.clients.openWindow(safeUrl);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) &&
                cacheName !== SHELL_CACHE &&
                cacheName !== STATIC_CACHE
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => caches.open(STATIC_CACHE))
      .then((cache) => trimStaticCache(cache))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !isSameOrigin(url)) {
    return;
  }

  // Launch data and Next.js flight payloads always use the network so a
  // service worker cannot pin stale application state.
  if (url.pathname.startsWith('/api/') || isFrameworkDataRequest(request, url)) {
    return;
  }

  // Navigations are never cached. A failed request receives only the static
  // offline document, including navigations with a query string.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isExplicitShellAsset(url)) {
    event.respondWith(cacheFirstShellAsset(request));
    return;
  }

  // Vercel appends its deployment ID to content-hashed Next.js assets. Keep
  // that single versioning parameter while rejecting every other query.
  if (isCacheableImmutableAsset(url)) {
    event.respondWith(cacheFirstImmutableAsset(request));
    return;
  }

  // Never cache arbitrary query-string GETs.
  if (url.search.length > 0) {
    return;
  }
});

self.addEventListener('push', (event) => {
  let rawPayload = {};

  try {
    rawPayload = event.data?.json() ?? {};
  } catch {
    rawPayload = { body: event.data?.text() || 'New rocket launch update!' };
  }

  const data = normalizePushPayload(rawPayload);
  const title = cleanPushText(data.title, 'LaunchWatch', 80);
  const body = cleanPushText(data.body, 'New rocket launch update!', 240);
  const tag = cleanPushText(data.tag, 'launchwatch-update', 80);
  const url = safeNotificationUrl(data.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag,
      data: { url },
      actions: [
        { action: 'view', title: 'View launch' },
        { action: 'close', title: 'Close' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const safeUrl = safeNotificationUrl(event.notification.data?.url);

  event.waitUntil(openNotificationDestination(safeUrl));
});
