import { Launch } from './types';

function markNotified(notificationKey: string): void {
  try {
    localStorage.setItem(notificationKey, 'true');
    localStorage.setItem(`${notificationKey}-timestamp`, Date.now().toString());
  } catch {
    // Notification delivery must not fail because storage is unavailable.
  }
}

function hasBeenNotified(notificationKey: string): boolean {
  try {
    return Boolean(localStorage.getItem(notificationKey));
  } catch {
    return false;
  }
}

function launchDestination(launch: Launch): string {
  return `/launch/${encodeURIComponent(launch.id)}`;
}

async function showViaServiceWorker(
  title: string,
  options: NotificationOptions
): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return false;
  }

  await registration.showNotification(title, options);
  return true;
}

/**
 * Show a notification for an upcoming launch
 */
export async function showLaunchNotification(
  launch: Launch,
  timeUntilLaunch: string
): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const title = `🚀 ${launch.name}`;
  const destination = launchDestination(launch);
  const options: NotificationOptions = {
    body: `Launching in ${timeUntilLaunch}\n${launch.rocket} from ${launch.launchSite}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `launch-${launch.id}`,
    requireInteraction: false,
    silent: false,
    data: {
      launchId: launch.id,
      url: destination,
    },
  };

  try {
    if (await showViaServiceWorker(title, options)) {
      return true;
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      window.location.assign(destination);
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Check launches and send notifications for upcoming ones
 */
export async function checkAndNotify(launches: Launch[]): Promise<void> {
  const now = Date.now();

  for (const launch of launches) {
    const launchTime = new Date(launch.date).getTime();
    const timeUntilLaunch = launchTime - now;

    // Notify for live launches
    if (launch.isLive) {
      const notificationKey = `notified-live-${launch.id}`;

      if (
        !hasBeenNotified(notificationKey) &&
        (await showLaunchNotification(launch, 'NOW!'))
      ) {
        markNotified(notificationKey);
      }
      continue;
    }

    // Notify for launches happening in 10 minutes
    if (timeUntilLaunch > 0 && timeUntilLaunch <= 10 * 60 * 1000) {
      const minutes = Math.floor(timeUntilLaunch / (60 * 1000));
      const notificationKey = `notified-10m-${launch.id}`;

      if (
        !hasBeenNotified(notificationKey) &&
        (await showLaunchNotification(launch, `${minutes} minutes`))
      ) {
        markNotified(notificationKey);
      }
      continue;
    }

    // Notify for launches happening in 1 hour
    if (timeUntilLaunch > 0 && timeUntilLaunch <= 60 * 60 * 1000) {
      const minutes = Math.floor(timeUntilLaunch / (60 * 1000));
      const notificationKey = `notified-1h-${launch.id}`;

      // Check if we've already notified for this launch
      if (
        !hasBeenNotified(notificationKey) &&
        (await showLaunchNotification(launch, `${minutes} minutes`))
      ) {
        markNotified(notificationKey);
      }
    }
  }
}

/**
 * Clear old notification flags from localStorage
 */
export function clearOldNotificationFlags(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach((key) => {
      if (key.startsWith('notified-') && !key.endsWith('-timestamp')) {
        // Remove notification flags older than 7 days
        const timestamp = localStorage.getItem(`${key}-timestamp`);
        if (
          timestamp &&
          now - Number.parseInt(timestamp, 10) > 7 * 24 * 60 * 60 * 1000
        ) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}-timestamp`);
        }
      }
    });
  } catch {
    // Storage can be unavailable in strict privacy modes.
  }
}
