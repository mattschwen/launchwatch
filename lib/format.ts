import type { Launch, LaunchDatePrecision } from './types';

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

const UTC_TIME = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

const UTC_MONTH = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const PLACEHOLDER_VALUE =
  /^(?:unknown(?:\s+(?:orbit|mission|profile|vehicle|rocket|site|pad))?|tbd|tbc|to be (?:determined|confirmed)|not (?:available|applicable|provided|supplied)|n\/?a|none|null|-|—)$/i;
const PLACEHOLDER_DESCRIPTION =
  /^(?:(?:mission\s+)?(?:details?|description))(?:\s+(?:are|is))?\s*(?:tbd|tbc|pending|to be (?:determined|confirmed)|not (?:available|provided|supplied))$/i;
const CRITICAL_STATUS_NAME =
  /\b(?:abort(?:ed)?|cancel(?:led|ed)?|failure|failed|hold|scrub(?:bed)?|warning|anomaly)\b/i;

export function isMeaningfulLaunchValue(
  value: string | null | undefined
): value is string {
  const normalized = value?.trim();
  return Boolean(normalized && !PLACEHOLDER_VALUE.test(normalized));
}

export function normalizeLaunchDescription(
  value: string | null | undefined
): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const withoutTerminalPunctuation = normalized
    .replace(/[.!?]+$/, '')
    .trim();
  if (
    !isMeaningfulLaunchValue(withoutTerminalPunctuation) ||
    PLACEHOLDER_DESCRIPTION.test(withoutTerminalPunctuation)
  ) {
    return null;
  }

  return normalized;
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

export function matchesLaunchSearch(launch: Launch, query: string): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const profile = [
    launch.name,
    launch.missionName,
    launch.missionType,
    launch.description,
    launch.program,
    launch.orbit,
    launch.rocket,
    launch.rocketFamily,
    launch.rocketVariant,
    launch.launchSite,
    launch.location?.name,
    launch.provider,
    launch.statusName,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .toLocaleLowerCase();

  return terms.every((term) => profile.includes(term));
}

export function formatLaunchDate(
  date: string,
  precision?: LaunchDatePrecision | null
): string {
  const target = formatLaunchTarget(date, precision);
  const label = formatLaunchPrecisionLabel(precision);
  return label && target !== 'Date unavailable'
    ? `${target} · ${label}`
    : target;
}

function precisionCode(
  precision: LaunchDatePrecision | null | undefined
): string | null {
  const value = precision?.abbrev?.trim() || precision?.name?.trim();
  return value ? value.toUpperCase() : null;
}

function precisionQuarter(code: string, date: Date): string {
  return /^Q[1-4]$/.test(code)
    ? code
    : `Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function precisionHalf(code: string, date: Date): string {
  return /^H[12]$/.test(code)
    ? code
    : `H${date.getUTCMonth() < 6 ? 1 : 2}`;
}

export function hasExactLaunchTime(
  precision: LaunchDatePrecision | null | undefined
): boolean {
  const code = precisionCode(precision);
  return code === null || code === 'SEC' || code === 'SECOND';
}

export function hasCountdownTarget(
  precision: LaunchDatePrecision | null | undefined
): boolean {
  const code = precisionCode(precision);
  return (
    hasExactLaunchTime(precision) ||
    code === 'MIN' ||
    code === 'MINUTE' ||
    code === 'HR' ||
    code === 'HOUR'
  );
}

export function hasCalendarReadyLaunchTime(
  precision: LaunchDatePrecision | null | undefined
): boolean {
  const code = precisionCode(precision);
  return (
    hasExactLaunchTime(precision) || code === 'MIN' || code === 'MINUTE'
  );
}

export function formatLaunchPrecisionLabel(
  precision: LaunchDatePrecision | null | undefined
): string | null {
  const code = precisionCode(precision);
  if (!code || code === 'SEC' || code === 'SECOND') return null;

  if (code === 'MIN' || code === 'MINUTE') return 'Minute estimate';
  if (code === 'HR' || code === 'HOUR') return 'Hour estimate';
  if (code === 'AM') return 'Morning estimate';
  if (code === 'PM') return 'Afternoon estimate';
  if (code === 'DAY') return 'Day estimate';
  if (code === 'WK' || code === 'WEEK') return 'Week estimate';
  if (code === 'M' || code === 'MONTH') return 'Month estimate';
  if (code.startsWith('Q') || code === 'QUARTER') return 'Quarter estimate';
  if (/^H[12]$/.test(code) || code === 'HALF') return 'Half-year estimate';
  if (code === 'Y' || code === 'YEAR') return 'Year estimate';
  if (code === 'FY' || code === 'FISCAL YEAR') return 'Fiscal-year estimate';
  if (code === 'DEC' || code === 'DECADE') return 'Decade estimate';
  return `${precision?.name || 'Date'} estimate`;
}

export function formatLaunchTarget(
  date: string,
  precision?: LaunchDatePrecision | null
): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

  const code = precisionCode(precision);
  const year = parsed.getUTCFullYear();
  if (code === 'M' || code === 'MONTH') return UTC_MONTH.format(parsed);
  if (code?.startsWith('Q') || code === 'QUARTER') {
    return `${precisionQuarter(code, parsed)} ${year}`;
  }
  if ((code && /^H[12]$/.test(code)) || code === 'HALF') {
    return `${precisionHalf(code, parsed)} ${year}`;
  }
  if (code === 'Y' || code === 'YEAR') return String(year);
  if (code === 'FY' || code === 'FISCAL YEAR') return `FY ${year}`;
  if (code === 'DEC' || code === 'DECADE') {
    return `${Math.floor(year / 10) * 10}s`;
  }
  if (code === 'WK' || code === 'WEEK') {
    return `Week of ${UTC_DATE.format(parsed)}`;
  }
  if (code === 'DAY' || code === 'AM' || code === 'PM') {
    return UTC_DATE.format(parsed);
  }

  return UTC_DATE_TIME.format(parsed);
}

export function formatLaunchDay(
  date: string,
  precision?: LaunchDatePrecision | null
): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

  const code = precisionCode(precision);
  if (
    code === 'M' ||
    code === 'MONTH' ||
    code?.startsWith('Q') ||
    code === 'QUARTER' ||
    (Boolean(code) && /^H[12]$/.test(code!)) ||
    code === 'HALF' ||
    code === 'Y' ||
    code === 'YEAR' ||
    code === 'FY' ||
    code === 'FISCAL YEAR' ||
    code === 'DEC' ||
    code === 'DECADE' ||
    code === 'WK' ||
    code === 'WEEK'
  ) {
    return formatLaunchTarget(date, precision);
  }

  return UTC_DATE.format(parsed);
}

export function formatLaunchTime(
  date: string,
  precision?: LaunchDatePrecision | null
): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Time unavailable';

  const label = formatLaunchPrecisionLabel(precision);
  const code = precisionCode(precision);
  if (
    code === 'DAY' ||
    code === 'AM' ||
    code === 'PM' ||
    code === 'WK' ||
    code === 'WEEK' ||
    code === 'M' ||
    code === 'MONTH' ||
    code?.startsWith('Q') ||
    code === 'QUARTER' ||
    (Boolean(code) && /^H[12]$/.test(code!)) ||
    code === 'HALF' ||
    code === 'Y' ||
    code === 'YEAR' ||
    code === 'FY' ||
    code === 'FISCAL YEAR' ||
    code === 'DEC' ||
    code === 'DECADE'
  ) {
    return label || 'Time pending';
  }

  const time = UTC_TIME.format(parsed);
  return label ? `${time} UTC · ${label}` : `${time} UTC`;
}

export function getLaunchWindowBounds(
  launch: Pick<Launch, 'date' | 'windowStart' | 'windowEnd'>
): { start: Date; end: Date } | null {
  const target = new Date(launch.date);
  const start = new Date(launch.windowStart || '');
  const end = new Date(launch.windowEnd || '');
  const targetTime = target.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();

  if (
    !Number.isFinite(targetTime) ||
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime <= startTime ||
    targetTime < startTime ||
    targetTime > endTime
  ) {
    return null;
  }

  return { start, end };
}

export function formatLaunchWindow(
  launch: Pick<Launch, 'date' | 'windowStart' | 'windowEnd'>
): string | null {
  const bounds = getLaunchWindowBounds(launch);
  if (!bounds) return null;

  const sameUtcDay =
    bounds.start.getUTCFullYear() === bounds.end.getUTCFullYear() &&
    bounds.start.getUTCMonth() === bounds.end.getUTCMonth() &&
    bounds.start.getUTCDate() === bounds.end.getUTCDate();

  if (sameUtcDay) {
    return `${UTC_DATE.format(bounds.start)}, ${UTC_TIME.format(
      bounds.start
    )}–${UTC_TIME.format(bounds.end)} UTC`;
  }

  return `${UTC_DATE_TIME.format(bounds.start)} – ${UTC_DATE_TIME.format(
    bounds.end
  )}`;
}

export function formatLaunchWindowTimes(
  launch: Pick<Launch, 'date' | 'windowStart' | 'windowEnd'>
): string | null {
  const bounds = getLaunchWindowBounds(launch);
  if (!bounds) return null;

  const sameUtcDay =
    bounds.start.getUTCFullYear() === bounds.end.getUTCFullYear() &&
    bounds.start.getUTCMonth() === bounds.end.getUTCMonth() &&
    bounds.start.getUTCDate() === bounds.end.getUTCDate();

  return sameUtcDay
    ? `${UTC_TIME.format(bounds.start)}–${UTC_TIME.format(bounds.end)} UTC`
    : formatLaunchWindow(launch);
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
