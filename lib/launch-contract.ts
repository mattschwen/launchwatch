import type { Launch, LaunchIntel } from './types';
import { parseLaunchId } from './launch-id';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isSafeOptionalUrl(value: unknown): boolean {
  return value === undefined || value === null || isSafeHttpsUrl(value);
}

function isSafeNullableUrl(value: unknown): boolean {
  return value === null || isSafeHttpsUrl(value);
}

function isSafeLaunchStreams(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (Array.isArray(value) &&
      value.every(
        (stream) => isRecord(stream) && isSafeHttpsUrl(stream.url),
      ))
  );
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
    isSafeNullableUrl(value.livestream) &&
    isSafeLaunchStreams(value.livestreams) &&
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

export function isLaunchIntel(value: unknown): value is LaunchIntel {
  if (!isRecord(value)) return false;

  const summary = value.summary;
  const quickLinks = value.quickLinks;
  const streamStates = ['live', 'upcoming', 'standby', 'search', 'none'];
  const streamSources = [
    'provided',
    'youtube-api',
    'provider-channel',
    'search',
  ];
  const confidenceLevels = ['high', 'medium', 'low'];
  const liveStates = ['live', 'upcoming', 'ended', 'unknown'];

  return (
    isRecord(summary) &&
    streamStates.includes(String(summary.streamState)) &&
    typeof summary.recommendedLabel === 'string' &&
    (summary.recommendedUrl === null ||
      isSafeHttpsUrl(summary.recommendedUrl)) &&
    typeof summary.rationale === 'string' &&
    typeof summary.lastUpdated === 'string' &&
    Array.isArray(value.streamCandidates) &&
    value.streamCandidates.every(
      (candidate) =>
        isRecord(candidate) &&
        typeof candidate.id === 'string' &&
        typeof candidate.title === 'string' &&
        isSafeHttpsUrl(candidate.url) &&
        typeof candidate.channelTitle === 'string' &&
        isSafeOptionalUrl(candidate.channelUrl) &&
        isSafeOptionalUrl(candidate.thumbnail) &&
        streamSources.includes(String(candidate.source)) &&
        confidenceLevels.includes(String(candidate.confidence)) &&
        liveStates.includes(String(candidate.liveStatus)),
    ) &&
    Array.isArray(value.newsItems) &&
    value.newsItems.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        isSafeHttpsUrl(item.url) &&
        typeof item.source === 'string' &&
        typeof item.publishedAt === 'string',
    ) &&
    Array.isArray(value.socialItems) &&
    value.socialItems.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        (item.platform === 'reddit' || item.platform === 'x') &&
        typeof item.title === 'string' &&
        isSafeHttpsUrl(item.url),
    ) &&
    isRecord(quickLinks) &&
    isSafeHttpsUrl(quickLinks.youtubeSearch) &&
    (quickLinks.providerChannel === null ||
      isSafeHttpsUrl(quickLinks.providerChannel)) &&
    isSafeHttpsUrl(quickLinks.redditSearch) &&
    isSafeHttpsUrl(quickLinks.xSearch)
  );
}
