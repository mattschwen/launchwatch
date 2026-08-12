import { Launch } from './types';
import {
  getLaunchLiveSignal,
  getLaunchSiteDisplay,
  hasCalendarReadyLaunchTime,
} from './format';

function markNotified(notificationKey: string, targetMinute?: string): void {
  try {
    localStorage.setItem(notificationKey, targetMinute ?? 'true');
    localStorage.setItem(`${notificationKey}-timestamp`, Date.now().toString());
  } catch {
    // Notification delivery must not fail because storage is unavailable.
  }
}

function hasBeenNotified(
  notificationKey: string,
  targetMinute?: string,
): boolean {
  try {
    const storedTarget = localStorage.getItem(notificationKey);
    if (!storedTarget) return false;
    if (!targetMinute) return true;

    if (storedTarget === 'true') {
      // Preserve a pre-target-aware alert without suppressing later retargets.
      localStorage.setItem(notificationKey, targetMinute);
      return true;
    }

    return storedTarget === targetMinute;
  } catch {
    return false;
  }
}

function launchTargetMinute(launchTime: number): string {
  return String(Math.floor(launchTime / (60 * 1000)));
}

function launchDestination(launch: Launch): string {
  return `/launch/${encodeURIComponent(launch.id)}`;
}

function formatLaunchLeadTime(timeUntilLaunch: number): string {
  const minutes = Math.floor(timeUntilLaunch / (60 * 1000));
  if (minutes < 1) return 'less than a minute';
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

async function showViaServiceWorker(
  title: string,
  options: NotificationOptions
): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    await registration.showNotification(title, options);
    return true;
  } catch {
    // A stale or stopping worker must not suppress the active-page fallback.
    return false;
  }
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
  const timingMessage =
    timeUntilLaunch === 'NOW!'
      ? getLaunchLiveSignal(launch) === 'mission'
        ? 'Mission in flight'
        : 'Coverage is live'
      : `Launching in ${timeUntilLaunch}`;
  const launchSite = getLaunchSiteDisplay(launch).label;
  const options: NotificationOptions = {
    body: `${timingMessage}\n${launch.rocket} from ${launchSite}`,
    icon: '/icon-192.png',
    badge: '/badge-96.png',
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
    if (!launch.isLive && !hasCalendarReadyLaunchTime(launch.datePrecision)) {
      continue;
    }

    const launchTime = new Date(launch.date).getTime();
    const timeUntilLaunch = launchTime - now;
    const targetMinute = launchTargetMinute(launchTime);

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
      const notificationKey = `notified-10m-${launch.id}`;

      if (
        !hasBeenNotified(notificationKey, targetMinute) &&
        (await showLaunchNotification(
          launch,
          formatLaunchLeadTime(timeUntilLaunch)
        ))
      ) {
        markNotified(notificationKey, targetMinute);
      }
      continue;
    }

    // Notify for launches happening in 1 hour
    if (timeUntilLaunch > 0 && timeUntilLaunch <= 60 * 60 * 1000) {
      const notificationKey = `notified-1h-${launch.id}`;

      // Check if we've already notified for this launch
      if (
        !hasBeenNotified(notificationKey, targetMinute) &&
        (await showLaunchNotification(
          launch,
          formatLaunchLeadTime(timeUntilLaunch)
        ))
      ) {
        markNotified(notificationKey, targetMinute);
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
