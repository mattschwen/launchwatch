import { Launch } from './types';
import {
  formatLaunchDate,
  formatLaunchWindow,
  getLaunchSiteDisplay,
  getLaunchWindowBounds,
} from './format';
import { getCanonicalLaunchUrl } from './share';

const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const LAUNCHWATCH_ORIGIN = 'https://www.launchwatch.io';

function getMissionUrl(launch: Pick<Launch, 'id'>): string {
  return getCanonicalLaunchUrl(launch.id, LAUNCHWATCH_ORIGIN);
}

function getCalendarBounds(launch: Launch): { start: Date; end: Date } {
  const providerWindow = getLaunchWindowBounds(launch);
  if (providerWindow) return providerWindow;

  const start = new Date(launch.date);
  return {
    start,
    end: new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS),
  };
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function safeCalendarUrl(value: string | null | undefined): string | null {
  if (!value || /[\r\n]/.test(value)) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function foldICSLine(line: string): string {
  const encoder = new TextEncoder();
  const folded: string[] = [];
  let segment = '';

  for (const character of line) {
    const candidate = `${segment}${character}`;
    if (segment && encoder.encode(candidate).length > 75) {
      folded.push(segment);
      segment = ` ${character}`;
    } else {
      segment = candidate;
    }
  }

  folded.push(segment);
  return folded.join('\r\n');
}

/**
 * Generate .ics file content for calendar apps
 */
export function generateICS(launch: Launch): string {
  const { start: startDate, end: endDate } = getCalendarBounds(launch);
  const launchWindow = formatLaunchWindow(launch);
  const launchSite = getLaunchSiteDisplay(launch).label;
  const missionUrl = getMissionUrl(launch);

  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const livestream = safeCalendarUrl(launch.livestream);
  const uid = launch.id.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 140);

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LaunchWatch//Rocket Launch//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:launch-${uid}@launchwatch.app`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeICSText(launch.name)}`,
    `DESCRIPTION:${escapeICSText([
      `Target Time: ${formatLaunchDate(launch.date, launch.datePrecision)}`,
      launchWindow ? `Launch Window: ${launchWindow}` : '',
      `Rocket: ${launch.rocket}`,
      `Launch Site: ${launchSite}`,
      launch.description || '',
      `Mission details: ${missionUrl}`,
      livestream ? `Watch Live: ${livestream}` : '',
    ].filter(Boolean).join('\n'))}`,
    `LOCATION:${escapeICSText(launchSite)}`,
    `STATUS:${launch.status === 'tbd' ? 'TENTATIVE' : 'CONFIRMED'}`,
    `SEQUENCE:0`,
    `URL:${missionUrl}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSText(launch.name)} launching in 1 hour!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return `${icsLines.map(foldICSLine).join('\r\n')}\r\n`;
}

/**
 * Download .ics file for a launch
 */
export function downloadICS(launch: Launch): void {
  const icsContent = generateICS(launch);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `launch-${launch.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarUrl(launch: Launch): string {
  const { start: startDate, end: endDate } = getCalendarBounds(launch);
  const launchWindow = formatLaunchWindow(launch);
  const launchSite = getLaunchSiteDisplay(launch).label;
  const missionUrl = getMissionUrl(launch);

  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: launch.name,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: [
      `Target Time: ${formatLaunchDate(launch.date, launch.datePrecision)}`,
      launchWindow ? `Launch Window: ${launchWindow}` : '',
      `Rocket: ${launch.rocket}`,
      `Launch Site: ${launchSite}`,
      launch.description || '',
      `Mission details: ${missionUrl}`,
      launch.livestream ? `\n\nWatch Live: ${launch.livestream}` : '',
    ].filter(Boolean).join('\n'),
    location: launchSite,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Format the portable mission brief used by clipboard and manual-copy flows.
 */
export function formatLaunchDetails(launch: Launch): string {
  const launchWindow = formatLaunchWindow(launch);
  const launchSite = getLaunchSiteDisplay(launch).label;
  const missionUrl = getMissionUrl(launch);
  return [
    `🚀 ${launch.name}`,
    ``,
    `📅 Target: ${formatLaunchDate(launch.date, launch.datePrecision)}`,
    launchWindow ? `🛰️ Window: ${launchWindow}` : '',
    `🚀 Rocket: ${launch.rocket}`,
    `📍 Launch Site: ${launchSite}`,
    launch.description ? `\n${launch.description}` : '',
    `\n🔗 Mission details: ${missionUrl}`,
    launch.livestream ? `\n🎥 Watch: ${launch.livestream}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * Copy launch details to clipboard
 */
export async function copyToClipboard(launch: Launch): Promise<boolean> {
  const text = formatLaunchDetails(launch);

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
