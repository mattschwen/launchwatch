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

const PLACEHOLDER_VALUE =
  /^(?:unknown(?:\s+(?:orbit|mission|profile|vehicle|rocket|site|pad))?|tbd|tbc|to be (?:determined|confirmed)|not (?:available|applicable|provided|supplied)|n\/?a|none|null|-|—)$/i;
const CRITICAL_STATUS_NAME =
  /\b(?:abort(?:ed)?|cancel(?:led|ed)?|failure|failed|hold|scrub(?:bed)?|warning|anomaly)\b/i;

export function isMeaningfulLaunchValue(
  value: string | null | undefined
): value is string {
  const normalized = value?.trim();
  return Boolean(normalized && !PLACEHOLDER_VALUE.test(normalized));
}

export function isCriticalLaunchStatusName(
  value: string | null | undefined
): boolean {
  return Boolean(value && CRITICAL_STATUS_NAME.test(value));
}

export function formatLaunchValue(
  value: string | null | undefined,
  fallback = 'Not provided'
): string {
  return isMeaningfulLaunchValue(value) ? value.trim() : fallback;
}

export function firstLaunchValue(
  values: Array<string | null | undefined>,
  fallback = 'Not provided'
): string {
  return values.find(isMeaningfulLaunchValue)?.trim() || fallback;
}

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

export function formatTimelineOffset(offset: string): string {
  const normalized = offset.trim();
  const match =
    /^([+-])?P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
      normalized
    );

  if (!match || match.slice(2).every((value) => value === undefined)) {
    return normalized;
  }

  const [, sign, days = '0', hours = '0', minutes = '0', seconds = '0'] =
    match;
  const [wholeSeconds, fractionalSeconds] = seconds.split('.');
  const dayLabel = Number(days) > 0 ? `${Number(days)}d ` : '';
  const secondLabel = `${wholeSeconds.padStart(2, '0')}${
    fractionalSeconds ? `.${fractionalSeconds}` : ''
  }`;

  return `T${sign === '-' ? '−' : '+'}${dayLabel}${hours.padStart(
    2,
    '0'
  )}:${minutes.padStart(2, '0')}:${secondLabel}`;
}

export function shortenLaunchSite(site: string): string {
  return site
    .replace(/Space Launch Complex/gi, 'SLC')
    .replace(/Launch Complex/gi, 'LC')
    .replace(/Launch Pad/gi, 'Pad')
    .replace(/\bSLC[\s-]+([0-9]+[A-Z]?)\b/gi, 'SLC-$1')
    .replace(/\bLC[\s-]+([0-9]+[A-Z]?)\b/gi, 'LC-$1')
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
