import type { Launch } from './types';
import { parseLaunchId } from './launch-id';

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
  const parsedId =
    typeof value.id === 'string' ? parseLaunchId(value.id) : null;
  const sourceId = value.sourceId;
  const canonicalIdentity = Boolean(
    parsedId &&
      !parsedId.legacy &&
      parsedId.source === value.source &&
      (sourceId === undefined ||
        sourceId === null ||
        sourceId === parsedId.sourceId),
  );

  return (
    canonicalIdentity &&
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

export function isLaunchCollection(value: unknown): value is Launch[] {
  if (!Array.isArray(value)) return false;

  const launchIds = new Set<string>();
  for (const launch of value) {
    if (!isLaunch(launch) || launchIds.has(launch.id)) return false;
    launchIds.add(launch.id);
  }

  return true;
}
