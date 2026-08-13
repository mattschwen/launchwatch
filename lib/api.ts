import {
  SpaceXLaunch,
  SpaceXRocket,
  LL2Launch,
  LL2Media,
  LL2Video,
  APOD,
  Launch,
  LaunchDatePrecision,
  LaunchFeedMeta,
  LaunchFeedResult,
  LaunchProviderMeta,
  LaunchVisual,
  RocketFact,
} from './types';
import {
  firstLaunchValue,
  isMeaningfulLaunchValue,
  normalizeLaunchDescription,
  normalizeTimeZone,
} from './format';
import { isEligibleLaunchVisual } from './launch-visual';
import { extractYouTubeId } from './youtube';
import { parseLaunchId, toCanonicalLaunchId } from './launch-id';
import { FailureCooldown } from './failure-cooldown';

export { parseLaunchId, toCanonicalLaunchId } from './launch-id';

// API Configuration
const SPACEX_PUBLIC_API = 'https://api.spacexdata.com/v4';
const SPACEX_API_OVERRIDE = process.env.SPACEX_API_BASE_URL?.trim() || '';
const SPACEX_API = (
  SPACEX_API_OVERRIDE || SPACEX_PUBLIC_API
).replace(/\/+$/, '');
const SPACEX_MERGED_FEED_ENABLED = Boolean(SPACEX_API_OVERRIDE);
const LL2_API_KEY = process.env.LL2_API_KEY || '';
const LL2_PUBLIC_API = 'https://ll.thespacedevs.com/2.3.0';
const LL2_API = (
  process.env.LL2_API_BASE_URL || LL2_PUBLIC_API
).replace(/\/+$/, '');
const NASA_API = 'https://api.nasa.gov';
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const PROVIDER_TIMEOUT_MS = 12_000;
const PROVIDER_FAILURE_COOLDOWN_MS = 30_000;
export const MAX_HISTORY_LIMIT = 100;
const MAX_PROVIDER_UPDATES = 5;
const MAX_FAILURE_REASON_LENGTH = 500;
const MAX_STATUS_DESCRIPTION_LENGTH = 300;
const MAX_MISSION_PROGRAMS = 8;
const MAX_MISSION_PROGRAM_LENGTH = 120;
const MAX_LAUNCH_DESIGNATOR_LENGTH = 32;
const MAX_PAD_TURNAROUND_SECONDS = 100 * 366 * 24 * 60 * 60;
const MAX_VEHICLE_LAUNCH_COUNT = 10_000_000;

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for most data
const LL2_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for LL2 (rate limited - 15 req/hour)
const MAX_CACHE_ENTRIES = 250;
type CacheEntry<T> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const providerFailureCooldown = new FailureCooldown({
  durationMs: PROVIDER_FAILURE_COOLDOWN_MS,
  maxEntries: MAX_CACHE_ENTRIES,
});

interface ProviderDataResult<T> {
  data: T;
  meta: LaunchProviderMeta;
  notFound?: boolean;
}

export interface LaunchDetailResult extends LaunchFeedResult<Launch | null> {
  canonicalId: string | null;
  invalidId: boolean;
  notFound: boolean;
}

class ProviderFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderFetchError';
  }
}

function getCachedEntry<T>(key: string, customDuration?: number): CacheEntry<T> | null {
  const cached = cache.get(key);
  const duration = customDuration || CACHE_DURATION;
  if (cached && Date.now() - cached.timestamp < duration) {
    cache.delete(key);
    cache.set(key, cached);
    return cached as CacheEntry<T>;
  }
  return null;
}

function getCachedData<T>(key: string, customDuration?: number): T | null {
  return getCachedEntry<T>(key, customDuration)?.data ?? null;
}

function getStaleCachedEntry<T>(key: string): CacheEntry<T> | null {
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
  }
  return cached ? (cached as CacheEntry<T>) : null;
}

function setCachedData<T>(key: string, data: T): void {
  cache.delete(key);
  cache.set(key, { data, timestamp: Date.now() });

  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

async function withInFlightDedupe<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const request = loader();
  inFlightRequests.set(key, request);

  try {
    return await request;
  } finally {
    if (inFlightRequests.get(key) === request) {
      inFlightRequests.delete(key);
    }
  }
}

function toIso(timestamp: number | null): string | null {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function providerMeta(
  state: LaunchProviderMeta['state'],
  cached: boolean,
  updatedAt: number | null,
  error?: unknown,
): LaunchProviderMeta {
  const meta: LaunchProviderMeta = {
    state,
    cached,
    updatedAt: toIso(updatedAt),
  };

  if (error) {
    meta.error = error instanceof Error ? error.message : 'Provider request failed';
  }

  return meta;
}

function notRequestedProvider(): LaunchProviderMeta {
  return providerMeta('not-requested', false, null);
}

function buildFeedMeta(
  spacex: LaunchProviderMeta,
  ll2: LaunchProviderMeta,
): LaunchFeedMeta {
  const requested = [spacex, ll2].filter((provider) => provider.state !== 'not-requested');
  const degraded = requested.some((provider) => provider.state === 'error' || provider.state === 'stale');

  return {
    generatedAt: new Date().toISOString(),
    partial: degraded,
    stale: requested.some((provider) => provider.state === 'stale'),
    cached: requested.length > 0 && requested.every((provider) => provider.cached),
    providers: { spacex, ll2 },
  };
}

async function fetchJson<T>(
  url: string,
  init: RequestInit & { next?: { revalidate: number } } = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      signal: init.signal || AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ProviderFetchError(
      error instanceof Error ? error.message : 'Provider request failed',
    );
  }

  if (!response.ok) {
    throw new ProviderFetchError(`Provider request failed with ${response.status}`, response.status);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new ProviderFetchError('Provider returned invalid JSON', response.status);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSpaceXLaunch(value: unknown): value is SpaceXLaunch {
  if (!isRecord(value) || !isRecord(value.links)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.date_utc === 'string' &&
    typeof value.date_unix === 'number' &&
    typeof value.upcoming === 'boolean'
  );
}

function isLL2Launch(value: unknown): value is LL2Launch {
  if (!isRecord(value) || !isRecord(value.status) || !isRecord(value.rocket) || !isRecord(value.pad)) {
    return false;
  }

  const configuration = value.rocket.configuration;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.net === 'string' &&
    typeof value.status.name === 'string' &&
    typeof value.status.abbrev === 'string' &&
    isRecord(configuration) &&
    typeof configuration.name === 'string' &&
    typeof value.pad.name === 'string'
  );
}

function readSpaceXDocs(payload: unknown): SpaceXLaunch[] {
  if (!isRecord(payload) || !Array.isArray(payload.docs)) {
    throw new ProviderFetchError('SpaceX returned an invalid launches payload');
  }

  if (!payload.docs.every(isSpaceXLaunch)) {
    throw new ProviderFetchError('SpaceX returned an invalid launch record');
  }

  return payload.docs;
}

function readLL2Results(payload: unknown): LL2Launch[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new ProviderFetchError('Launch Library 2 returned an invalid launches payload');
  }

  if (!payload.results.every(isLL2Launch)) {
    throw new ProviderFetchError(
      'Launch Library 2 returned an invalid launch record',
    );
  }

  return payload.results;
}

function getLL2Headers(): HeadersInit {
  return LL2_API_KEY ? { Authorization: `Token ${LL2_API_KEY}` } : {};
}

async function getSpaceXUpcomingLaunchesWithMeta(): Promise<ProviderDataResult<SpaceXLaunch[]>> {
  const cacheKey = 'spacex_upcoming';
  const cached = getCachedEntry<SpaceXLaunch[]>(cacheKey);
  if (cached) {
    return { data: cached.data, meta: providerMeta('ok', true, cached.timestamp) };
  }

  try {
    const result = await providerFailureCooldown.run(cacheKey, () =>
      fetchJson<unknown>(`${SPACEX_API}/launches/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { upcoming: true },
          options: {
            populate: ['rocket', 'launchpad'],
            sort: { date_unix: 'asc' },
          },
        }),
        next: { revalidate: 300 },
      }),
    );
    const data = readSpaceXDocs(result);
    setCachedData(cacheKey, data);
    return { data, meta: providerMeta('ok', false, Date.now()) };
  } catch (error) {
    const stale = getStaleCachedEntry<SpaceXLaunch[]>(cacheKey);
    if (stale) {
      return {
        data: stale.data,
        meta: providerMeta('stale', true, stale.timestamp, error),
      };
    }
    return { data: [], meta: providerMeta('error', false, null, error) };
  }
}

// SpaceX API Functions
export async function getSpaceXUpcomingLaunches(): Promise<SpaceXLaunch[]> {
  return (await getSpaceXUpcomingLaunchesWithMeta()).data;
}

async function getSpaceXPastLaunchesWithMeta(limit: number = 10): Promise<ProviderDataResult<SpaceXLaunch[]>> {
  const boundedLimit = Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.trunc(limit)));
  const cacheKey = `spacex_past_${boundedLimit}`;
  const cached = getCachedEntry<SpaceXLaunch[]>(cacheKey, 60 * 60 * 1000);
  if (cached) {
    return { data: cached.data, meta: providerMeta('ok', true, cached.timestamp) };
  }

  try {
    const result = await providerFailureCooldown.run(cacheKey, () =>
      fetchJson<unknown>(`${SPACEX_API}/launches/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { upcoming: false },
          options: {
            populate: ['rocket', 'launchpad'],
            sort: { date_unix: 'desc' },
            limit: boundedLimit,
          },
        }),
        next: { revalidate: 3600 },
      }),
    );
    const data = readSpaceXDocs(result);
    setCachedData(cacheKey, data);
    return { data, meta: providerMeta('ok', false, Date.now()) };
  } catch (error) {
    const stale = getStaleCachedEntry<SpaceXLaunch[]>(cacheKey);
    if (stale) {
      return {
        data: stale.data,
        meta: providerMeta('stale', true, stale.timestamp, error),
      };
    }
    return { data: [], meta: providerMeta('error', false, null, error) };
  }
}

export async function getSpaceXPastLaunches(limit: number = 10): Promise<SpaceXLaunch[]> {
  return (await getSpaceXPastLaunchesWithMeta(limit)).data;
}

async function getSpaceXLaunchByIdWithMeta(sourceId: string): Promise<ProviderDataResult<SpaceXLaunch | null>> {
  const cacheKey = `spacex_launch_${sourceId}`;
  const cached = getCachedEntry<SpaceXLaunch>(cacheKey, 60 * 60 * 1000);
  if (cached) {
    return { data: cached.data, meta: providerMeta('ok', true, cached.timestamp) };
  }

  try {
    const result = await providerFailureCooldown.run(cacheKey, () =>
      fetchJson<unknown>(`${SPACEX_API}/launches/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { _id: sourceId },
          options: {
            populate: ['rocket', 'launchpad'],
            limit: 1,
          },
        }),
        next: { revalidate: 3600 },
      }),
    );
    const launch = readSpaceXDocs(result)[0] || null;
    if (!launch) {
      return {
        data: null,
        meta: providerMeta('ok', false, Date.now()),
        notFound: true,
      };
    }
    setCachedData(cacheKey, launch);
    return { data: launch, meta: providerMeta('ok', false, Date.now()) };
  } catch (error) {
    const stale = getStaleCachedEntry<SpaceXLaunch>(cacheKey);
    if (stale) {
      return {
        data: stale.data,
        meta: providerMeta('stale', true, stale.timestamp, error),
      };
    }
    return { data: null, meta: providerMeta('error', false, null, error) };
  }
}

export async function getSpaceXRockets(): Promise<SpaceXRocket[]> {
  const cacheKey = 'spacex_rockets';
  const cached = getCachedData<SpaceXRocket[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${SPACEX_API}/rockets`, {
      next: { revalidate: 86400 } // Rocket data changes very rarely
    });
    if (!response.ok) throw new Error('Failed to fetch SpaceX rockets');
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching SpaceX rockets:', error);
    return [];
  }
}

// Launch Library 2 API Functions
async function getLL2UpcomingLaunchesWithMeta(limit: number = 20): Promise<ProviderDataResult<LL2Launch[]>> {
  const boundedLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const cacheKey = `ll2_upcoming_${boundedLimit}`;
  const cached = getCachedEntry<LL2Launch[]>(cacheKey, LL2_CACHE_DURATION);
  if (cached) {
    return { data: cached.data, meta: providerMeta('ok', true, cached.timestamp) };
  }

  try {
    const result = await providerFailureCooldown.run(cacheKey, () =>
      fetchJson<unknown>(
        `${LL2_API}/launches/upcoming/?limit=${boundedLimit}&mode=normal`,
        {
          headers: getLL2Headers(),
          next: { revalidate: 1800 },
        },
      ),
    );
    const data = readLL2Results(result);
    setCachedData(cacheKey, data);
    return { data, meta: providerMeta('ok', false, Date.now()) };
  } catch (error) {
    const stale = getStaleCachedEntry<LL2Launch[]>(cacheKey);
    if (stale) {
      return {
        data: stale.data,
        meta: providerMeta('stale', true, stale.timestamp, error),
      };
    }
    return { data: [], meta: providerMeta('error', false, null, error) };
  }
}

export async function getLL2UpcomingLaunches(limit: number = 20): Promise<LL2Launch[]> {
  return (await getLL2UpcomingLaunchesWithMeta(limit)).data;
}

async function getLL2PastLaunchesWithMeta(limit: number = 50): Promise<ProviderDataResult<LL2Launch[]>> {
  const boundedLimit = Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.trunc(limit)));
  const cacheKey = `ll2_past_${boundedLimit}`;
  const cached = getCachedEntry<LL2Launch[]>(cacheKey, 60 * 60 * 1000);
  if (cached) {
    return { data: cached.data, meta: providerMeta('ok', true, cached.timestamp) };
  }

  try {
    const result = await providerFailureCooldown.run(cacheKey, () =>
      fetchJson<unknown>(
        `${LL2_API}/launches/previous/?limit=${boundedLimit}&mode=normal`,
        {
          headers: getLL2Headers(),
          next: { revalidate: 3600 },
        },
      ),
    );
    const data = readLL2Results(result);
    setCachedData(cacheKey, data);
    return { data, meta: providerMeta('ok', false, Date.now()) };
  } catch (error) {
    const stale = getStaleCachedEntry<LL2Launch[]>(cacheKey);
    if (stale) {
      return {
        data: stale.data,
        meta: providerMeta('stale', true, stale.timestamp, error),
      };
    }
    return { data: [], meta: providerMeta('error', false, null, error) };
  }
}

async function getLL2LaunchByIdWithMeta(sourceId: string): Promise<ProviderDataResult<LL2Launch | null>> {
  const cacheKey = `ll2_launch_${sourceId}`;
  const cached = getCachedEntry<LL2Launch>(cacheKey, LL2_CACHE_DURATION);
  if (cached) {
    return { data: cached.data, meta: providerMeta('ok', true, cached.timestamp) };
  }

  try {
    const result = await providerFailureCooldown.run(cacheKey, () =>
      fetchJson<unknown>(
        `${LL2_API}/launches/${encodeURIComponent(sourceId)}/?mode=detailed`,
        {
          headers: getLL2Headers(),
          next: { revalidate: 1800 },
        },
      ),
    );
    if (!isLL2Launch(result)) {
      throw new ProviderFetchError('Launch Library 2 returned an invalid launch payload');
    }
    setCachedData(cacheKey, result);
    return { data: result, meta: providerMeta('ok', false, Date.now()) };
  } catch (error) {
    if (error instanceof ProviderFetchError && error.status === 404) {
      return {
        data: null,
        meta: providerMeta('ok', false, Date.now()),
        notFound: true,
      };
    }
    const stale = getStaleCachedEntry<LL2Launch>(cacheKey);
    if (stale) {
      return {
        data: stale.data,
        meta: providerMeta('stale', true, stale.timestamp, error),
      };
    }
    return { data: null, meta: providerMeta('error', false, null, error) };
  }
}

// NASA API Functions
export async function getNASAAPOD(): Promise<APOD | null> {
  const cacheKey = 'nasa_apod';
  const cached = getCachedData<APOD>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${NASA_API}/planetary/apod?api_key=${NASA_API_KEY}`, {
      next: { revalidate: 86400 } // APOD changes daily
    });
    if (!response.ok) throw new Error('Failed to fetch NASA APOD');
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching NASA APOD:', error);
    return null;
  }
}

function buildYouTubeThumbnail(url: string | null | undefined): string | null {
  const videoId = url ? extractYouTubeId(url) : null;
  return videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;
}

function mediaUrl(media: LL2Media | string | null | undefined): string | null {
  if (typeof media === 'string') {
    return media || null;
  }
  return typeof media?.image_url === 'string' ? media.image_url || null : null;
}

function optionalText(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function providerFailureReason(
  value: string | null | undefined,
): string | null {
  if (!isMeaningfulLaunchValue(value)) return null;

  const normalized = value.trim();
  return normalized.length <= MAX_FAILURE_REASON_LENGTH ? normalized : null;
}

function providerStatusDescription(
  value: string | null | undefined,
): string | null {
  const normalized = optionalText(value);
  return normalized && normalized.length <= MAX_STATUS_DESCRIPTION_LENGTH
    ? normalized
    : null;
}

function providerPrograms(
  value: LL2Launch['program'],
): NonNullable<Launch['programs']> {
  if (!Array.isArray(value)) return [];

  return value.reduce<NonNullable<Launch['programs']>>((programs, item) => {
    const name = isMeaningfulLaunchValue(item?.name)
      ? item.name.trim()
      : null;
    if (
      !name ||
      name.length > MAX_MISSION_PROGRAM_LENGTH ||
      programs.length >= MAX_MISSION_PROGRAMS ||
      programs.some(
        (program) =>
          program.localeCompare(name, undefined, { sensitivity: 'base' }) === 0,
      )
    ) {
      return programs;
    }

    programs.push(name);
    return programs;
  }, []);
}

function providerTimestamp(value: string | null | undefined): string | null {
  const normalized = optionalText(value);
  if (!normalized) return null;

  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function providerLaunchDesignator(
  value: string | null | undefined,
): string | null {
  const normalized = optionalText(value);
  return normalized &&
    normalized.length <= MAX_LAUNCH_DESIGNATOR_LENGTH &&
    /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)
    ? normalized
    : null;
}

function positiveProviderCount(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function providerDurationSeconds(
  value: string | null | undefined,
): number | null {
  const normalized = optionalText(value);
  if (!normalized) return null;

  const match = normalized.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!match || match.slice(1).every((part) => part === undefined)) return null;

  const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
  if (
    (normalized.includes('T') && match.slice(2).every((part) => part === undefined)) ||
    Number(hours) >= 24 ||
    Number(minutes) >= 60 ||
    Number(seconds) >= 60
  ) {
    return null;
  }
  const parts = [days, hours, minutes, seconds].map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part))) return null;

  const totalSeconds =
    parts[0] * 86_400 + parts[1] * 3_600 + parts[2] * 60 + parts[3];
  return totalSeconds > 0 && totalSeconds <= MAX_PAD_TURNAROUND_SECONDS
    ? totalSeconds
    : null;
}

function safeProviderCoverageUrl(
  value: string | null | undefined,
): string | null {
  const normalized = optionalText(value);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'https:' &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
      ? normalized
      : null;
  } catch {
    return null;
  }
}

function officialMissionUrl(infoUrls: LL2Launch['info_urls']): string | null {
  if (!Array.isArray(infoUrls)) return null;

  return [...infoUrls]
    .sort((left, right) => (right?.priority ?? 0) - (left?.priority ?? 0))
    .flatMap((candidate) => {
      const type = optionalText(candidate?.type?.name)?.toLocaleLowerCase();
      const url = safeProviderCoverageUrl(candidate?.url);
      return type?.includes('official') && url ? [url] : [];
    })[0] ?? null;
}

function trajectorySimulationUrl(value: string | null | undefined): string | null {
  const safeUrl = safeProviderCoverageUrl(value);
  if (!safeUrl) return null;

  const hostname = new URL(safeUrl).hostname.toLocaleLowerCase();
  return hostname === 'flightclub.io' || hostname.endsWith('.flightclub.io')
    ? safeUrl
    : null;
}

function normalizeProviderUpdates(
  updates: LL2Launch['updates'],
): NonNullable<Launch['providerUpdates']> {
  if (!Array.isArray(updates)) return [];

  const seen = new Set<string>();
  return updates
    .flatMap((update) => {
      const comment = optionalText(update?.comment);
      const createdAt = optionalText(update?.created_on);
      if (
        !comment ||
        comment.length > 500 ||
        !createdAt ||
        Number.isNaN(Date.parse(createdAt))
      ) {
        return [];
      }

      const normalizedCreatedAt = new Date(createdAt).toISOString();
      const key = `${normalizedCreatedAt}\u0000${comment.toLocaleLowerCase()}`;
      if (seen.has(key)) return [];
      seen.add(key);

      return [{
        id:
          typeof update.id === 'number' &&
          Number.isInteger(update.id) &&
          update.id > 0
            ? String(update.id)
            : key,
        comment,
        createdAt: normalizedCreatedAt,
        sourceUrl: safeProviderCoverageUrl(update.info_url),
      }];
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_PROVIDER_UPDATES);
}

function normalizeDatePrecision(value: unknown): LaunchDatePrecision | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized
      ? { name: normalized, abbrev: normalized.toUpperCase() }
      : null;
  }

  if (!isRecord(value)) return null;
  const name = optionalText(
    typeof value.name === 'string' ? value.name : undefined
  );
  const abbrev = optionalText(
    typeof value.abbrev === 'string' ? value.abbrev : undefined
  );
  const description = optionalText(
    typeof value.description === 'string' ? value.description : undefined
  );
  if (!name || !abbrev) return null;

  return {
    name,
    abbrev,
    ...(description ? { description } : {}),
  };
}

function ll2Visual(
  kind: LaunchVisual['kind'],
  media: LL2Media | string | null | undefined,
  fallbackUrl: string | null | undefined,
  launchId: string,
): LaunchVisual | null {
  const url = optionalText(mediaUrl(media)) || optionalText(fallbackUrl);
  if (!url) {
    return null;
  }

  const metadata = typeof media === 'object' && media ? media : null;
  const thumbnailUrl = optionalText(metadata?.thumbnail_url);
  const name = optionalText(metadata?.name);
  const credit = optionalText(metadata?.credit);
  const licenseName = optionalText(metadata?.license?.name);
  const licenseUrl = optionalText(metadata?.license?.link);

  return {
    kind,
    url,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(name ? { name } : {}),
    ...(credit ? { credit } : {}),
    ...(licenseName ? { licenseName } : {}),
    ...(licenseUrl ? { licenseUrl } : {}),
    ...(typeof metadata?.single_use === 'boolean'
      ? { singleUse: metadata.single_use }
      : {}),
    sourceLabel: 'Launch Library 2',
    sourceUrl: `${LL2_PUBLIC_API}/launches/${encodeURIComponent(launchId)}/`,
  };
}

function preferredLaunchVisual(
  candidates: Array<LaunchVisual | null>
): LaunchVisual | null {
  const supplied = candidates.filter(
    (candidate): candidate is LaunchVisual => candidate !== null
  );

  return (
    supplied.find((candidate) => isEligibleLaunchVisual(candidate)) ??
    supplied[0] ??
    null
  );
}

function ll2RocketFamily(launch: LL2Launch): string | null {
  const configuration = launch.rocket.configuration;
  if (typeof configuration.family === 'string' && configuration.family) {
    return configuration.family;
  }

  const family = (Array.isArray(configuration.families) ? configuration.families : []).find(
    (candidate) => typeof candidate?.name === 'string' && candidate.name.length > 0,
  );
  return family?.name || null;
}

function providerVehicleRecord(
  configuration: LL2Launch['rocket']['configuration'],
): Launch['vehicleRecord'] {
  const counts = [
    configuration.total_launch_count,
    configuration.successful_launches,
    configuration.failed_launches,
  ];
  if (
    counts.some(
      (value) =>
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > MAX_VEHICLE_LAUNCH_COUNT,
    )
  ) {
    return null;
  }

  const [totalLaunchCount, successfulLaunches, failedLaunches] = counts as [
    number,
    number,
    number,
  ];
  if (successfulLaunches + failedLaunches !== totalLaunchCount) return null;

  const maidenFlight = optionalText(configuration.maiden_flight);
  const maidenTimestamp = maidenFlight && /^\d{4}-\d{2}-\d{2}$/.test(maidenFlight)
    ? new Date(`${maidenFlight}T00:00:00.000Z`).getTime()
    : Number.NaN;
  const normalizedMaidenFlight =
    maidenFlight &&
    Number.isFinite(maidenTimestamp) &&
    new Date(maidenTimestamp).toISOString().slice(0, 10) === maidenFlight
      ? maidenFlight
      : null;

  return {
    maidenFlight: normalizedMaidenFlight,
    totalLaunchCount,
    successfulLaunches,
    failedLaunches,
  };
}

function canCoverLaunchWindow(
  launch: LL2Launch,
  video: LL2Video,
): boolean {
  if (video.live || launch.webcast_live || !video.end_time) return true;

  const coverageEnd = new Date(video.end_time).getTime();
  const launchWindowStart = new Date(
    launch.window_start || launch.net
  ).getTime();

  return (
    !Number.isFinite(coverageEnd) ||
    !Number.isFinite(launchWindowStart) ||
    coverageEnd >= launchWindowStart
  );
}

function ll2Videos(launch: LL2Launch): LL2Video[] {
  const candidates = [
    ...(Array.isArray(launch.vid_urls) ? launch.vid_urls : []),
    ...(Array.isArray(launch.vidURLs) ? launch.vidURLs : []),
    ...(Array.isArray(launch.mission?.vid_urls) ? launch.mission.vid_urls : []),
  ];
  const seen = new Set<string>();

  return candidates
    .flatMap((candidate, index) => {
      const url = safeProviderCoverageUrl(candidate?.url);
      return url && canCoverLaunchWindow(launch, candidate)
        ? [{ candidate: { ...candidate, url }, index }]
        : [];
    })
    .sort((left, right) => {
      const trust = (video: LL2Video): number => {
        const type = video.type?.name?.trim().toLowerCase() || '';
        if (type.startsWith('official')) return 2;
        if (type.includes('unofficial')) return 0;
        return 1;
      };
      const trustDifference = trust(right.candidate) - trust(left.candidate);
      if (trustDifference !== 0) return trustDifference;

      const liveDifference = Number(Boolean(right.candidate.live)) -
        Number(Boolean(left.candidate.live));
      if (liveDifference !== 0) return liveDifference;

      const priorityDifference = (right.candidate.priority ?? 0) -
        (left.candidate.priority ?? 0);
      return priorityDifference || left.index - right.index;
    })
    .flatMap(({ candidate }) => {
      if (seen.has(candidate.url)) return [];
      seen.add(candidate.url);
      return [candidate];
    });
}

function coordinate(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

function inferProvider(launch: LL2Launch): { name: string; logo: string | null } {
  if (launch.launch_service_provider?.name) {
    return {
      name: launch.launch_service_provider.name,
      logo:
        mediaUrl(launch.launch_service_provider.logo) ||
        mediaUrl(launch.launch_service_provider.logo_url),
    };
  }

  const name = launch.name.toLowerCase();
  const rocketFamily = (ll2RocketFamily(launch) || '').toLowerCase();

  if (name.includes('spacex') || rocketFamily.includes('falcon') || rocketFamily.includes('starship')) {
    return { name: 'SpaceX', logo: null };
  }
  if (name.includes('nasa') || name.includes('artemis')) {
    return { name: 'NASA', logo: null };
  }
  if (name.includes('ula') || rocketFamily.includes('atlas') || rocketFamily.includes('vulcan') || rocketFamily.includes('delta')) {
    return { name: 'ULA', logo: null };
  }
  if (name.includes('rocket lab') || rocketFamily.includes('electron') || rocketFamily.includes('neutron')) {
    return { name: 'Rocket Lab', logo: null };
  }
  if (name.includes('blue origin') || rocketFamily.includes('new glenn') || rocketFamily.includes('new shepard')) {
    return { name: 'Blue Origin', logo: null };
  }
  if (name.includes('ariane') || name.includes('vega')) {
    return { name: 'Arianespace', logo: null };
  }

  return { name: 'Unknown', logo: null };
}

function mapLaunchStatus(
  status: Pick<LL2Launch['status'], 'id' | 'abbrev'>,
): Launch['status'] {
  if (status.id === 9 || status.abbrev === 'Deployed') return 'success';

  switch (status.abbrev) {
    case 'Go':
      return 'upcoming';
    case 'Success':
      return 'success';
    case 'Failure':
    case 'Partial Failure':
      return 'failure';
    case 'In Flight':
      return 'live';
    default:
      return 'tbd';
  }
}

function spaceXCoordinate(
  value: number | string | null | undefined,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value.trim())
      : Number.NaN;

  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export function normalizeSpaceXLaunch(launch: SpaceXLaunch): Launch {
  const status: Launch['status'] = launch.upcoming
    ? 'upcoming'
    : launch.success === true
      ? 'success'
      : launch.success === false
        ? 'failure'
        : 'tbd';
  const statusName = launch.upcoming
    ? 'Scheduled'
    : launch.success === true
      ? 'Success'
      : launch.success === false
        ? 'Failure'
        : 'Outcome pending';
  const populatedRocket = typeof launch.rocket === 'object' && launch.rocket
    ? launch.rocket
    : null;
  const rocket: string = populatedRocket
    ? populatedRocket.name || 'Unknown Rocket'
    : typeof launch.rocket === 'string'
      ? launch.rocket || 'Unknown Rocket'
      : 'Unknown Rocket';
  const populatedLaunchpad = typeof launch.launchpad === 'object' && launch.launchpad
    ? launch.launchpad
    : null;
  const launchSite = populatedLaunchpad
    ? firstLaunchValue([
        populatedLaunchpad.name,
        populatedLaunchpad.full_name,
        populatedLaunchpad.locality,
        populatedLaunchpad.region,
      ], 'Unknown Site')
    : firstLaunchValue([
        typeof launch.launchpad === 'string' ? launch.launchpad : null,
      ], 'Unknown Site');
  const latitude = spaceXCoordinate(populatedLaunchpad?.latitude, -90, 90);
  const longitude = spaceXCoordinate(populatedLaunchpad?.longitude, -180, 180);
  const locality = isMeaningfulLaunchValue(populatedLaunchpad?.locality)
    ? populatedLaunchpad.locality.trim()
    : null;
  const region = isMeaningfulLaunchValue(populatedLaunchpad?.region)
    ? populatedLaunchpad.region.trim()
    : null;
  const locationLabel = [
    locality,
    region && region !== locality ? region : null,
  ].filter((value): value is string => Boolean(value)).join(', ') || firstLaunchValue([
    populatedLaunchpad?.full_name,
    populatedLaunchpad?.name,
  ], launchSite);
  const webcast = safeProviderCoverageUrl(launch.links.webcast);
  const image = launch.links.flickr?.original?.[0] || null;
  const rocketImage = (Array.isArray(populatedRocket?.flickr_images)
    ? populatedRocket.flickr_images
    : [])
    .map(optionalText)
    .find((candidate): candidate is string => Boolean(candidate)) || null;
  const vehicleVisual: LaunchVisual | null = rocketImage && populatedRocket
    ? {
        kind: 'vehicle',
        url: rocketImage,
        credit: 'SpaceX',
        sourceLabel: 'SpaceX API',
        sourceUrl: `${SPACEX_PUBLIC_API}/rockets/${encodeURIComponent(populatedRocket.id)}`,
      }
    : null;
  const missionVisual: LaunchVisual | null = image
    ? {
        kind: 'mission',
        url: image,
        credit: 'SpaceX',
        sourceLabel: 'SpaceX API',
        sourceUrl: `${SPACEX_PUBLIC_API}/launches/${encodeURIComponent(launch.id)}`,
      }
    : null;

  return {
    id: toCanonicalLaunchId('spacex', launch.id),
    sourceId: launch.id,
    name: launch.name,
    launchDesignator: null,
    date: launch.date_utc,
    dateUnix: launch.date_unix,
    datePrecision: normalizeDatePrecision(launch.date_precision),
    rocket,
    launchSite,
    status,
    statusName,
    statusDescription: null,
    providerUpdatedAt: null,
    orbitalLaunchAttemptCountYear: null,
    providerLaunchAttemptCountYear: null,
    padLaunchAttemptCountYear: null,
    officialMissionUrl: null,
    trajectorySimulationUrl: null,
    missionName: launch.name,
    missionAgencies: null,
    livestream: webcast,
    livestreams: webcast ? [{
      url: webcast,
      title: launch.upcoming ? 'Official webcast' : 'Recorded webcast',
      isLive: false,
      thumbnail: buildYouTubeThumbnail(webcast),
    }] : null,
    description: normalizeLaunchDescription(launch.details),
    isLive: false,
    webcastLive: false,
    image,
    missionPatch: launch.links.patch?.small || null,
    rocketImageUrl: rocketImage,
    launchImageUrl: image,
    vehicleVisual,
    missionVisual,
    padMapImage: null,
    location: latitude !== null && longitude !== null ? {
      lat: latitude,
      lng: longitude,
      name: locationLabel,
    } : null,
    provider: 'SpaceX',
    providerLogo: null,
    program: null,
    programs: null,
    timeline: null,
    videoThumbnail: buildYouTubeThumbnail(webcast),
    source: 'spacex',
    ll2Id: null,
    orbit: null,
    rocketFamily: rocket,
    rocketVariant: null,
    vehicleRecord: null,
  };
}

export function normalizeLL2Launch(launch: LL2Launch): Launch {
  const provider = inferProvider(launch);
  const configuration = launch.rocket.configuration;
  const livestreams = ll2Videos(launch).map((stream) => ({
    url: stream.url,
    title: stream.title || 'Stream',
    priority: stream.priority,
    source: stream.source || null,
    thumbnail: stream.feature_image || buildYouTubeThumbnail(stream.url),
    type: stream.type?.name || null,
    startTime: stream.start_time || null,
    endTime: stream.end_time || null,
    isLive: Boolean(stream.live || launch.webcast_live),
  }));
  const latitude = coordinate(launch.pad.latitude);
  const longitude = coordinate(launch.pad.longitude);
  const sourceStatus = mapLaunchStatus(launch.status);
  const isLive =
    Boolean(launch.webcast_live) ||
    sourceStatus === 'live' ||
    livestreams.some((stream) => stream.isLive);
  const parsedDate = new Date(launch.net).getTime() / 1000;
  const rocketImage = mediaUrl(configuration.image) || mediaUrl(configuration.image_url);
  const launchImage = mediaUrl(launch.image);
  const missionImage = mediaUrl(launch.mission?.image);
  const vehicleVisual = ll2Visual(
    'vehicle',
    configuration.image,
    configuration.image_url,
    launch.id,
  );
  const missionVisual = preferredLaunchVisual([
    ll2Visual('mission', launch.image, null, launch.id),
    ll2Visual('mission', launch.mission?.image, null, launch.id),
  ]);
  const family = ll2RocketFamily(launch);
  const missionPatch = (Array.isArray(launch.mission_patches) ? launch.mission_patches : [])
    .find((patch) => typeof patch?.image_url === 'string' && patch.image_url.length > 0)
    ?.image_url || null;
  const countryCode =
    launch.pad.location?.country_code ||
    launch.pad.country?.alpha_2_code ||
    launch.pad.location?.country?.alpha_2_code ||
    undefined;
  const timeZone = normalizeTimeZone(
    optionalText(launch.pad.location?.timezone_name),
  );
  const launcherStages = Array.isArray(launch.rocket.launcher_stage)
    ? launch.rocket.launcher_stage
    : [];
  const providerFirstStage =
    launcherStages.find((stage) => stage?.type?.trim().toLowerCase() === 'core') ??
    launcherStages[0] ??
    null;
  const serialNumber = optionalText(
    providerFirstStage?.launcher?.serial_number,
  ) ?? null;
  const flightNumber =
    typeof providerFirstStage?.launcher_flight_number === 'number' &&
    Number.isInteger(providerFirstStage.launcher_flight_number) &&
    providerFirstStage.launcher_flight_number > 0
      ? providerFirstStage.launcher_flight_number
      : null;
  const reused =
    typeof providerFirstStage?.reused === 'boolean'
      ? providerFirstStage.reused
      : null;
  const landingAttempt =
    typeof providerFirstStage?.landing?.attempt === 'boolean'
      ? providerFirstStage.landing.attempt
      : null;
  const landingSuccess =
    typeof providerFirstStage?.landing?.success === 'boolean'
      ? providerFirstStage.landing.success
      : null;
  const landingLocation = optionalText(
    providerFirstStage?.landing?.landing_location?.name,
  ) ?? null;
  const landingLocationAbbrev = optionalText(
    providerFirstStage?.landing?.landing_location?.abbrev,
  ) ?? null;
  const landingType = optionalText(providerFirstStage?.landing?.type?.name) ?? null;
  const landingTypeAbbrev = optionalText(
    providerFirstStage?.landing?.type?.abbrev,
  ) ?? null;
  const firstStage =
    providerFirstStage &&
    (serialNumber ||
      flightNumber !== null ||
      reused !== null ||
      landingAttempt !== null ||
      landingSuccess !== null ||
      landingLocation ||
      landingLocationAbbrev ||
      landingType ||
      landingTypeAbbrev)
      ? {
          serialNumber,
          flightNumber,
          reused,
          landingAttempt,
          landingSuccess,
          landingLocation,
          landingLocationAbbrev,
          landingType,
          landingTypeAbbrev,
        }
      : null;
  const missionAgencies = (Array.isArray(launch.mission?.agencies)
    ? launch.mission.agencies
    : []
  ).reduce<NonNullable<Launch['missionAgencies']>>((agencies, agency) => {
    const name = isMeaningfulLaunchValue(agency?.name)
      ? agency.name.trim()
      : null;
    if (
      !name ||
      agencies.some(
        (candidate) =>
          candidate.name.localeCompare(name, undefined, {
            sensitivity: 'base',
          }) === 0,
      )
    ) {
      return agencies;
    }

    const abbrev = isMeaningfulLaunchValue(agency?.abbrev)
      ? agency.abbrev.trim()
      : null;
    const type = isMeaningfulLaunchValue(agency?.type?.name)
      ? agency.type.name.trim()
      : null;
    agencies.push({ name, abbrev, type });
    return agencies;
  }, []);
  const providerUpdates = normalizeProviderUpdates(launch.updates);
  const programs = providerPrograms(launch.program);

  return {
    id: toCanonicalLaunchId('ll2', launch.id),
    sourceId: launch.id,
    name: launch.name,
    launchDesignator: providerLaunchDesignator(launch.launch_designator),
    date: launch.net,
    dateUnix: Number.isFinite(parsedDate) ? parsedDate : 0,
    datePrecision: normalizeDatePrecision(launch.net_precision),
    rocket: configuration.name || 'Unknown Rocket',
    launchSite: launch.pad.name || 'Unknown Site',
    status: isLive ? 'live' : sourceStatus,
    statusName: launch.status.name || launch.status.abbrev || null,
    statusDescription: providerStatusDescription(launch.status.description),
    providerUpdatedAt: providerTimestamp(launch.last_updated),
    orbitalLaunchAttemptCountYear: positiveProviderCount(
      launch.orbital_launch_attempt_count_year,
    ),
    providerLaunchAttemptCountYear: positiveProviderCount(
      launch.agency_launch_attempt_count_year,
    ),
    padLaunchAttemptCountYear: positiveProviderCount(
      launch.pad_launch_attempt_count_year,
    ),
    padTurnaroundSeconds: providerDurationSeconds(launch.pad_turnaround),
    missionName: isMeaningfulLaunchValue(launch.mission?.name)
      ? launch.mission.name.trim()
      : null,
    missionType: isMeaningfulLaunchValue(launch.mission?.type)
      ? launch.mission.type.trim()
      : null,
    missionAgencies: missionAgencies.length > 0 ? missionAgencies : null,
    windowStart: launch.window_start || null,
    windowEnd: launch.window_end || null,
    launchProbability:
      typeof launch.probability === 'number' &&
      Number.isInteger(launch.probability) &&
      launch.probability >= 0 &&
      launch.probability <= 100
        ? launch.probability
        : null,
    weatherConcerns: optionalText(launch.weather_concerns) ?? null,
    holdReason: optionalText(launch.holdreason) ?? null,
    failureReason:
      sourceStatus === 'failure'
        ? providerFailureReason(launch.failreason)
        : null,
    livestream: livestreams?.[0]?.url || null,
    livestreams: livestreams.length > 0 ? livestreams : null,
    description: normalizeLaunchDescription(launch.mission?.description),
    isLive,
    webcastLive: Boolean(launch.webcast_live),
    image: launchImage || missionImage || rocketImage,
    missionPatch,
    rocketImageUrl: rocketImage,
    launchImageUrl: launchImage || missionImage,
    vehicleVisual,
    missionVisual,
    padMapImage: mediaUrl(launch.pad.map_image) || mediaUrl(launch.pad.image),
    location: Number.isFinite(latitude) && Number.isFinite(longitude) ? {
      lat: latitude,
      lng: longitude,
      name: launch.pad.location?.name || launch.pad.name || 'Unknown Site',
      countryCode,
      ...(timeZone ? { timeZone } : {}),
    } : null,
    provider: provider.name,
    providerLogo: provider.logo,
    program: programs[0] ?? null,
    programs: programs.length > 0 ? programs : null,
    timeline: Array.isArray(launch.timeline)
      ? launch.timeline.flatMap((event) => {
        const type = event?.type?.name || event?.type?.abbrev;
        if (!type || !event.relative_time) {
          return [];
        }
        return [{
          type,
          relativeTime: event.relative_time,
          description: event.description || event.type.description || '',
        }];
      })
      : null,
    providerUpdates: providerUpdates.length > 0 ? providerUpdates : null,
    officialMissionUrl: officialMissionUrl(launch.info_urls),
    trajectorySimulationUrl: trajectorySimulationUrl(launch.flightclub_url),
    videoThumbnail: livestreams?.[0]?.thumbnail || null,
    source: 'll2',
    ll2Id: launch.id,
    orbit: isMeaningfulLaunchValue(launch.mission?.orbit?.name)
      ? launch.mission.orbit.name.trim()
      : null,
    rocketFamily: family,
    rocketVariant: configuration.variant || null,
    vehicleRecord: providerVehicleRecord(configuration),
    firstStage,
  };
}

function missionDedupeKey(launch: Launch): string {
  return (launch.name.split('|').pop() || launch.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeLaunches(launches: Launch[]): Launch[] {
  const deduped: Launch[] = [];

  for (const launch of launches) {
    const duplicateIndex = deduped.findIndex((candidate) => (
      candidate.source !== launch.source &&
      missionDedupeKey(candidate) === missionDedupeKey(launch) &&
      Math.abs(candidate.dateUnix - launch.dateUnix) <= 30 * 60
    ));

    if (duplicateIndex === -1) {
      deduped.push(launch);
    } else if (launch.source === 'll2') {
      // LL2 generally carries richer pad, status, image, and webcast metadata.
      deduped[duplicateIndex] = launch;
    }
  }

  return deduped;
}

function launchScheduleEndUnix(launch: Launch): number {
  if (launch.status === 'success' || launch.status === 'failure') {
    return launch.dateUnix;
  }

  const windowEndUnix = launch.windowEnd
    ? new Date(launch.windowEnd).getTime() / 1000
    : Number.NaN;

  return Number.isFinite(windowEndUnix)
    ? Math.max(launch.dateUnix, windowEndUnix)
    : launch.dateUnix;
}

export async function getAllUpcomingLaunchesResult(): Promise<LaunchFeedResult<Launch[]>> {
  return withInFlightDedupe('feed:upcoming', async () => {
    const [spacex, ll2] = await Promise.all([
      SPACEX_MERGED_FEED_ENABLED
        ? getSpaceXUpcomingLaunchesWithMeta()
        : Promise.resolve({
            data: [],
            meta: notRequestedProvider(),
          } satisfies ProviderDataResult<SpaceXLaunch[]>),
      getLL2UpcomingLaunchesWithMeta(50),
    ]);
    const nowUnix = Date.now() / 1000;
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const threeMonthsUnix = threeMonthsFromNow.getTime() / 1000;
    const launches = dedupeLaunches([
      ...spacex.data.map(normalizeSpaceXLaunch),
      ...ll2.data.map(normalizeLL2Launch),
    ])
      .filter((launch) => (
        Number.isFinite(launch.dateUnix) &&
        (launch.isLive || launchScheduleEndUnix(launch) >= nowUnix) &&
        launch.dateUnix <= threeMonthsUnix
      ))
      .sort((left, right) => left.dateUnix - right.dateUnix);

    return {
      data: launches,
      meta: buildFeedMeta(spacex.meta, ll2.meta),
    };
  });
}

// Compatibility wrapper for existing callers.
export async function getAllUpcomingLaunches(): Promise<Launch[]> {
  return (await getAllUpcomingLaunchesResult()).data;
}

export async function getPastLaunchesResult(limit: number = 50): Promise<LaunchFeedResult<Launch[]>> {
  const boundedLimit = Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.trunc(limit)));
  return withInFlightDedupe(`feed:history:${boundedLimit}`, async () => {
    const [spacex, ll2] = await Promise.all([
      SPACEX_MERGED_FEED_ENABLED
        ? getSpaceXPastLaunchesWithMeta(boundedLimit)
        : Promise.resolve({
            data: [],
            meta: notRequestedProvider(),
          } satisfies ProviderDataResult<SpaceXLaunch[]>),
      getLL2PastLaunchesWithMeta(boundedLimit),
    ]);
    const nowUnix = Date.now() / 1000;
    const launches = dedupeLaunches([
      ...spacex.data.map(normalizeSpaceXLaunch),
      ...ll2.data.map(normalizeLL2Launch),
    ])
      .filter((launch) => (
        Number.isFinite(launch.dateUnix) &&
        !launch.isLive &&
        launchScheduleEndUnix(launch) < nowUnix
      ))
      .sort((left, right) => right.dateUnix - left.dateUnix)
      .slice(0, boundedLimit);

    return {
      data: launches,
      meta: buildFeedMeta(spacex.meta, ll2.meta),
    };
  });
}

export async function getLaunchByIdResult(value: string): Promise<LaunchDetailResult> {
  const parsed = parseLaunchId(value);
  if (!parsed) {
    return {
      data: null,
      canonicalId: null,
      invalidId: true,
      notFound: false,
      meta: buildFeedMeta(notRequestedProvider(), notRequestedProvider()),
    };
  }

  return withInFlightDedupe(`detail:${parsed.canonicalId}`, async () => {
    if (parsed.source === 'spacex') {
      const result = await getSpaceXLaunchByIdWithMeta(parsed.sourceId);
      return {
        data: result.data ? normalizeSpaceXLaunch(result.data) : null,
        canonicalId: parsed.canonicalId,
        invalidId: false,
        notFound: Boolean(result.notFound),
        meta: buildFeedMeta(result.meta, notRequestedProvider()),
      };
    }

    const result = await getLL2LaunchByIdWithMeta(parsed.sourceId);
    return {
      data: result.data ? normalizeLL2Launch(result.data) : null,
      canonicalId: parsed.canonicalId,
      invalidId: false,
      notFound: Boolean(result.notFound),
      meta: buildFeedMeta(notRequestedProvider(), result.meta),
    };
  });
}

export async function getLiveLaunchesResult(): Promise<LaunchFeedResult<Launch[]>> {
  const result = await getAllUpcomingLaunchesResult();
  return {
    data: result.data.filter((launch) => launch.isLive),
    meta: result.meta,
  };
}

export async function getLiveLaunches(): Promise<Launch[]> {
  return (await getLiveLaunchesResult()).data;
}

// Rocket Facts Generator
export async function getRocketFacts(): Promise<RocketFact[]> {
  const facts: RocketFact[] = [];

  try {
    const [rockets, apod] = await Promise.all([
      getSpaceXRockets(),
      getNASAAPOD()
    ]);

    // Add rocket statistics
    rockets.forEach((rocket, index) => {
      facts.push({
        id: `rocket-height-${index}`,
        type: 'stat',
        title: `${rocket.name} Height`,
        value: `${rocket.height.meters}m (${rocket.height.feet}ft)`,
        source: 'spacex'
      });

      facts.push({
        id: `rocket-mass-${index}`,
        type: 'stat',
        title: `${rocket.name} Mass`,
        value: `${rocket.mass.kg.toLocaleString()}kg`,
        source: 'spacex'
      });

      facts.push({
        id: `rocket-success-${index}`,
        type: 'stat',
        title: `${rocket.name} Success Rate`,
        value: `${rocket.success_rate_pct}%`,
        source: 'spacex'
      });

      if (rocket.description) {
        facts.push({
          id: `rocket-desc-${index}`,
          type: 'trivia',
          title: rocket.name,
          value: rocket.description,
          source: 'spacex'
        });
      }
    });

    // Add NASA APOD
    if (apod) {
      facts.push({
        id: 'apod',
        type: 'apod',
        title: apod.title,
        value: apod.explanation,
        source: 'nasa'
      });
    }

    // Add some curated trivia
    const trivia: RocketFact[] = [
      {
        id: 'trivia-1',
        type: 'trivia',
        title: 'Fastest Rocket',
        value: 'The Saturn V rocket reached speeds of 40,000 km/h during Apollo missions',
        source: 'nasa'
      },
      {
        id: 'trivia-2',
        type: 'trivia',
        title: 'Reusable Innovation',
        value: 'SpaceX Falcon 9 first stage has been reused over 20 times',
        source: 'spacex'
      },
      {
        id: 'trivia-3',
        type: 'trivia',
        title: 'Fuel Capacity',
        value: 'The Space Shuttle external tank held 227,000 liters of liquid hydrogen',
        source: 'nasa'
      }
    ];

    facts.push(...trivia);

    return facts;
  } catch (error) {
    console.error('Error generating rocket facts:', error);
    return [];
  }
}

export async function getNextLaunchResult(): Promise<LaunchFeedResult<Launch | null>> {
  const result = await getAllUpcomingLaunchesResult();
  return {
    data: result.data[0] || null,
    meta: result.meta,
  };
}

// Compatibility wrapper for existing callers.
export async function getNextLaunch(): Promise<Launch | null> {
  return (await getNextLaunchResult()).data;
}
