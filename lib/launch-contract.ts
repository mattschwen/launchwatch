import type { Launch } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function isLaunch(value: unknown): value is Launch {
  if (!isRecord(value)) return false;

  const statuses = ['upcoming', 'live', 'success', 'failure', 'tbd'];
  const sources = ['spacex', 'll2'];
  const timeline = value.timeline;

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.date === 'string' &&
    typeof value.dateUnix === 'number' &&
    Number.isFinite(value.dateUnix) &&
    typeof value.rocket === 'string' &&
    typeof value.launchSite === 'string' &&
    statuses.includes(String(value.status)) &&
    isNullableString(value.livestream) &&
    isNullableString(value.description) &&
    typeof value.isLive === 'boolean' &&
    sources.includes(String(value.source)) &&
    (timeline === undefined ||
      timeline === null ||
      (Array.isArray(timeline) &&
        timeline.every(
          (event) =>
            isRecord(event) &&
            typeof event.type === 'string' &&
            typeof event.relativeTime === 'string' &&
            typeof event.description === 'string',
        )))
  );
}
