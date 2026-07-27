import type { Launch } from './types';

const UTC_DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
  timeZoneName: 'short',
});

const UTC_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatLaunchDate(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : UTC_DATE_TIME.format(parsed);
}

export function formatLaunchDay(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : UTC_DATE.format(parsed);
}

export function formatRelativeDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

  const difference = parsed.getTime() - Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (Math.abs(difference) < day) return difference >= 0 ? 'Today' : 'Earlier today';
  if (difference >= day && difference < day * 2) return 'Tomorrow';
  if (difference < -day && difference > -day * 2) return 'Yesterday';
  return formatLaunchDay(date);
}

export function shortenLaunchSite(site: string): string {
  return site
    .replace(/Space Launch Complex/gi, 'SLC')
    .replace(/Launch Complex/gi, 'LC')
    .replace(/Launch Pad/gi, 'Pad')
    .replace(/Cape Canaveral Space Force Station/gi, 'Cape Canaveral')
    .replace(/Kennedy Space Center/gi, 'Kennedy')
    .replace(/Vandenberg Space Force Base/gi, 'Vandenberg')
    .replace(/, United States of America/gi, '')
    .replace(/, USA/gi, '');
}

export function launchOutcomeLabel(launch: Launch): string {
  switch (launch.status) {
    case 'success':
      return 'Success';
    case 'failure':
      return 'Failure';
    case 'live':
      return 'Live';
    case 'tbd':
      return launch.statusName || 'To be confirmed';
    default:
      return launch.statusName || 'Scheduled';
  }
}

export function isCompletedLaunch(launch: Launch): boolean {
  return launch.status === 'success' || launch.status === 'failure';
}
