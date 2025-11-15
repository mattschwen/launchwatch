import { Launch } from './types';

/**
 * Generate .ics file content for calendar apps
 */
export function generateICS(launch: Launch): string {
  const startDate = new Date(launch.date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string): string => {
    return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LaunchWatch//Rocket Launch//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:launch-${launch.id}@launchwatch.app`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeText(launch.name)}`,
    `DESCRIPTION:${escapeText([
      `Rocket: ${launch.rocket}`,
      `Launch Site: ${launch.launchSite}`,
      launch.description ? `\\n${launch.description}` : '',
      launch.livestream ? `\\n\\nWatch Live: ${launch.livestream}` : '',
    ].filter(Boolean).join('\\n'))}`,
    `LOCATION:${escapeText(launch.launchSite)}`,
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`,
    launch.livestream ? `URL:${launch.livestream}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(launch.name)} launching in 1 hour!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return icsContent;
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
  const startDate = new Date(launch.date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: launch.name,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: [
      `Rocket: ${launch.rocket}`,
      `Launch Site: ${launch.launchSite}`,
      launch.description || '',
      launch.livestream ? `\n\nWatch Live: ${launch.livestream}` : '',
    ].filter(Boolean).join('\n'),
    location: launch.launchSite,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Copy launch details to clipboard
 */
export async function copyToClipboard(launch: Launch): Promise<boolean> {
  const text = [
    `🚀 ${launch.name}`,
    ``,
    `📅 ${new Date(launch.date).toLocaleString()}`,
    `🚀 Rocket: ${launch.rocket}`,
    `📍 Launch Site: ${launch.launchSite}`,
    launch.description ? `\n${launch.description}` : '',
    launch.livestream ? `\n🎥 Watch: ${launch.livestream}` : '',
  ].filter(Boolean).join('\n');

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
