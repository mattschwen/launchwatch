import { Launch } from './types';

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Show a notification for an upcoming launch
 */
export function showLaunchNotification(launch: Launch, timeUntilLaunch: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(`🚀 ${launch.name}`, {
    body: `Launching in ${timeUntilLaunch}\n${launch.rocket} from ${launch.launchSite}`,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: `launch-${launch.id}`,
    requireInteraction: false,
    silent: false,
    data: {
      launchId: launch.id,
      livestream: launch.livestream,
    },
  });

  notification.onclick = () => {
    window.focus();
    if (launch.livestream) {
      window.open(launch.livestream, '_blank');
    }
    notification.close();
  };
}

/**
 * Check launches and send notifications for upcoming ones
 */
export function checkAndNotify(launches: Launch[]): void {
  const now = Date.now();

  launches.forEach((launch) => {
    const launchTime = new Date(launch.date).getTime();
    const timeUntilLaunch = launchTime - now;

    // Notify for launches happening in 1 hour
    if (timeUntilLaunch > 0 && timeUntilLaunch <= 60 * 60 * 1000) {
      const minutes = Math.floor(timeUntilLaunch / (60 * 1000));
      const notificationKey = `notified-1h-${launch.id}`;

      // Check if we've already notified for this launch
      if (!localStorage.getItem(notificationKey)) {
        showLaunchNotification(launch, `${minutes} minutes`);
        localStorage.setItem(notificationKey, 'true');
      }
    }

    // Notify for launches happening in 10 minutes
    if (timeUntilLaunch > 0 && timeUntilLaunch <= 10 * 60 * 1000) {
      const minutes = Math.floor(timeUntilLaunch / (60 * 1000));
      const notificationKey = `notified-10m-${launch.id}`;

      if (!localStorage.getItem(notificationKey)) {
        showLaunchNotification(launch, `${minutes} minutes`);
        localStorage.setItem(notificationKey, 'true');
      }
    }

    // Notify for live launches
    if (launch.isLive) {
      const notificationKey = `notified-live-${launch.id}`;

      if (!localStorage.getItem(notificationKey)) {
        showLaunchNotification(launch, 'NOW!');
        localStorage.setItem(notificationKey, 'true');
      }
    }
  });
}

/**
 * Clear old notification flags from localStorage
 */
export function clearOldNotificationFlags(): void {
  const keys = Object.keys(localStorage);
  const now = Date.now();

  keys.forEach((key) => {
    if (key.startsWith('notified-')) {
      // Remove notification flags older than 7 days
      const timestamp = localStorage.getItem(`${key}-timestamp`);
      if (timestamp && now - parseInt(timestamp) > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}-timestamp`);
      }
    }
  });
}
