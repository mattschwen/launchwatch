import type {
  Launch,
  LaunchFeedMeta,
  LaunchIntel,
  LaunchProviderMeta,
  LaunchSiteAtlasResponse,
} from './types';
import { isSupportedLaunchVisualUrl } from './launch-visual';
import { normalizeTimeZone } from './format';
import { parseLaunchId } from './launch-id';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || isNullableString(value);
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim()) return false;

  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}

function isOptionalProviderTimestamp(value: unknown): boolean {
  return value === undefined || value === null || isCanonicalTimestamp(value);
}

function isProviderMeta(value: unknown): value is LaunchProviderMeta {
  if (!isRecord(value)) return false;

  const states = ['ok', 'stale', 'error', 'not-requested'];
  return (
    states.includes(String(value.state)) &&
    typeof value.cached === 'boolean' &&
    (value.updatedAt === null || isCanonicalTimestamp(value.updatedAt)) &&
    (value.error === undefined ||
      (typeof value.error === 'string' &&
        value.error === value.error.trim() &&
        value.error.length > 0))
  );
}

function isLaunchProbability(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 100)
  );
}

function isOptionalPositiveInteger(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' && Number.isInteger(value) && value > 0)
  );
}

function isLaunchTarget(date: unknown, dateUnix: unknown): boolean {
  if (
    typeof date !== 'string' ||
    date !== date.trim() ||
    date.length === 0 ||
    typeof dateUnix !== 'number' ||
    !Number.isSafeInteger(dateUnix)
  ) {
    return false;
  }

  const parsedDate = Date.parse(date);
  return (
    Number.isFinite(parsedDate) &&
    Math.floor(parsedDate / 1_000) === dateUnix
  );
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

function isRequiredTrimmedString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value === value.trim() &&
    value.length > 0
  );
}

function isOptionalTrimmedString(value: unknown): boolean {
  return value === undefined || isRequiredTrimmedString(value);
}

function isOptionalStatusDescription(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (isRequiredTrimmedString(value) && value.length <= 300)
  );
}

function isOptionalFailureReason(value: unknown, status: unknown): boolean {
  if (value === undefined || value === null) return true;

  return (
    status === 'failure' &&
    isRequiredTrimmedString(value) &&
    value.length <= 500
  );
}

function isSafeLaunchSiteVisual(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;

  return (
    (value.kind === 'vehicle' || value.kind === 'mission') &&
    typeof value.url === 'string' &&
    isSupportedLaunchVisualUrl(value.url) &&
    (value.thumbnailUrl === undefined ||
      (typeof value.thumbnailUrl === 'string' &&
        isSupportedLaunchVisualUrl(value.thumbnailUrl))) &&
    isOptionalTrimmedString(value.name) &&
    isOptionalTrimmedString(value.credit) &&
    isOptionalTrimmedString(value.licenseName) &&
    (value.licenseUrl === undefined || isSafeHttpsUrl(value.licenseUrl)) &&
    (value.singleUse === undefined || typeof value.singleUse === 'boolean') &&
    isRequiredTrimmedString(value.sourceLabel) &&
    (value.sourceUrl === undefined || isSafeHttpsUrl(value.sourceUrl))
  );
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

function isLaunchFirstStage(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;

  return (
    isNullableString(value.serialNumber) &&
    (value.flightNumber === null ||
      (typeof value.flightNumber === 'number' &&
        Number.isInteger(value.flightNumber) &&
        value.flightNumber > 0)) &&
    (value.reused === null || typeof value.reused === 'boolean') &&
    (value.landingAttempt === null ||
      typeof value.landingAttempt === 'boolean') &&
    (value.landingSuccess === null ||
      typeof value.landingSuccess === 'boolean') &&
    isNullableString(value.landingLocation) &&
    isNullableString(value.landingLocationAbbrev) &&
    isNullableString(value.landingType) &&
    isNullableString(value.landingTypeAbbrev)
  );
}

function isLaunchMissionAgencies(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(value)) return false;

  const names = new Set<string>();
  for (const agency of value) {
    if (
      !isRecord(agency) ||
      typeof agency.name !== 'string' ||
      agency.name !== agency.name.trim() ||
      agency.name.length === 0 ||
      !isNullableString(agency.abbrev) ||
      !isNullableString(agency.type)
    ) {
      return false;
    }

    const normalizedName = agency.name.toLocaleLowerCase();
    if (names.has(normalizedName)) return false;
    names.add(normalizedName);
  }

  return true;
}

function isLaunchProviderUpdates(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(value) || value.length > 5) return false;

  const ids = new Set<string>();
  for (const update of value) {
    if (
      !isRecord(update) ||
      typeof update.id !== 'string' ||
      update.id.length === 0 ||
      ids.has(update.id) ||
      typeof update.comment !== 'string' ||
      update.comment !== update.comment.trim() ||
      update.comment.length === 0 ||
      update.comment.length > 500 ||
      typeof update.createdAt !== 'string' ||
      Number.isNaN(Date.parse(update.createdAt)) ||
      new Date(update.createdAt).toISOString() !== update.createdAt ||
      !isSafeOptionalUrl(update.sourceUrl)
    ) {
      return false;
    }
    ids.add(update.id);
  }

  return true;
}

function isLaunchLocation(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;

  return (
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180 &&
    typeof value.name === 'string' &&
    value.name === value.name.trim() &&
    value.name.length > 0 &&
    (value.countryCode === undefined ||
      (typeof value.countryCode === 'string' &&
        value.countryCode === value.countryCode.trim() &&
        value.countryCode.length > 0)) &&
    (value.timeZone === undefined ||
      (typeof value.timeZone === 'string' &&
        normalizeTimeZone(value.timeZone) === value.timeZone))
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
    isLaunchTarget(value.date, value.dateUnix) &&
    typeof value.rocket === 'string' &&
    typeof value.launchSite === 'string' &&
    statuses.includes(String(value.status)) &&
    isOptionalStatusDescription(value.statusDescription) &&
    isOptionalProviderTimestamp(value.providerUpdatedAt) &&
    isOptionalPositiveInteger(value.orbitalLaunchAttemptCountYear) &&
    isOptionalPositiveInteger(value.providerLaunchAttemptCountYear) &&
    isOptionalPositiveInteger(value.padLaunchAttemptCountYear) &&
    isSafeNullableUrl(value.livestream) &&
    isSafeLaunchStreams(value.livestreams) &&
    isNullableString(value.description) &&
    typeof value.isLive === 'boolean' &&
    sources.includes(String(value.source)) &&
    isLaunchProbability(value.launchProbability) &&
    isOptionalNullableString(value.weatherConcerns) &&
    isOptionalNullableString(value.holdReason) &&
    isOptionalFailureReason(value.failureReason, value.status) &&
    isLaunchMissionAgencies(value.missionAgencies) &&
    isLaunchProviderUpdates(value.providerUpdates) &&
    isSafeOptionalUrl(value.officialMissionUrl) &&
    isSafeOptionalUrl(value.trajectorySimulationUrl) &&
    isLaunchFirstStage(value.firstStage) &&
    isLaunchLocation(value.location) &&
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

export function isLaunchFeedMeta(value: unknown): value is LaunchFeedMeta {
  if (!isRecord(value) || !isRecord(value.providers)) return false;

  return (
    isCanonicalTimestamp(value.generatedAt) &&
    typeof value.partial === 'boolean' &&
    typeof value.stale === 'boolean' &&
    typeof value.cached === 'boolean' &&
    isProviderMeta(value.providers.spacex) &&
    isProviderMeta(value.providers.ll2)
  );
}

export function isLaunchSiteAtlasResponse(
  value: unknown,
): value is LaunchSiteAtlasResponse {
  if (!isRecord(value) || !Array.isArray(value.sites)) return false;
  if (value.sites.length > 100 || !isRecord(value.meta)) return false;

  const ids = new Set<string>();
  for (const site of value.sites) {
    if (
      !isRecord(site) ||
      !isRequiredTrimmedString(site.id) ||
      ids.has(site.id) ||
      !isRequiredTrimmedString(site.name) ||
      typeof site.active !== 'boolean' ||
      typeof site.latitude !== 'number' ||
      !Number.isFinite(site.latitude) ||
      site.latitude < -90 ||
      site.latitude > 90 ||
      typeof site.longitude !== 'number' ||
      !Number.isFinite(site.longitude) ||
      site.longitude < -180 ||
      site.longitude > 180 ||
      !isRequiredTrimmedString(site.locationName) ||
      !isNullableString(site.countryCode) ||
      !isNullableString(site.description) ||
      !isNullableString(site.locationDescription) ||
      !isSafeNullableUrl(site.infoUrl) ||
      !isSafeNullableUrl(site.wikiUrl) ||
      typeof site.totalLaunchCount !== 'number' ||
      !Number.isSafeInteger(site.totalLaunchCount) ||
      site.totalLaunchCount < 0 ||
      typeof site.orbitalLaunchAttemptCount !== 'number' ||
      !Number.isSafeInteger(site.orbitalLaunchAttemptCount) ||
      site.orbitalLaunchAttemptCount < 0 ||
      !Array.isArray(site.agencies) ||
      site.agencies.length > 8 ||
      !site.agencies.every(isRequiredTrimmedString) ||
      new Set(site.agencies).size !== site.agencies.length ||
      !isSafeLaunchSiteVisual(site.image)
    ) {
      return false;
    }
    ids.add(site.id);
  }

  return (
    isCanonicalTimestamp(value.meta.generatedAt) &&
    typeof value.meta.cached === 'boolean' &&
    typeof value.meta.stale === 'boolean' &&
    value.meta.source === 'launch-library-2' &&
    isSafeHttpsUrl(value.meta.sourceUrl)
  );
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
