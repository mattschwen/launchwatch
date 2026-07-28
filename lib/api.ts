import {
  SpaceXLaunch,
  SpaceXRocket,
  LL2Launch,
  LL2Media,
  LL2Video,
  APOD,
  Launch,
  LaunchFeedMeta,
  LaunchFeedResult,
  LaunchProviderMeta,
  LaunchSource,
  RocketFact,
} from './types';
import { isMeaningfulLaunchValue } from './format';

// API Configuration
const SPACEX_API = (
  process.env.SPACEX_API_BASE_URL || 'https://api.spacexdata.com/v4'
).replace(/\/+$/, '');
const LL2_API_KEY = process.env.LL2_API_KEY || '';
const LL2_API = (
  process.env.LL2_API_BASE_URL || 'https://ll.thespacedevs.com/2.3.0'
).replace(/\/+$/, '');
const NASA_API = 'https://api.nasa.gov';
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const PROVIDER_TIMEOUT_MS = 12_000;
export const MAX_HISTORY_LIMIT = 100;

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for most data
const LL2_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for LL2 (rate limited - 15 req/hour)
const MAX_CACHE_ENTRIES = 250;
type CacheEntry<T> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

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

  return payload.docs.filter(isSpaceXLaunch);
}

function readLL2Results(payload: unknown): LL2Launch[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new ProviderFetchError('Launch Library 2 returned an invalid launches payload');
  }

  return payload.results.filter(isLL2Launch);
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
    const result = await fetchJson<unknown>(`${SPACEX_API}/launches/query`, {
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
    });
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
    const result = await fetchJson<unknown>(`${SPACEX_API}/launches/query`, {
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
    });
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
    const result = await fetchJson<unknown>(`${SPACEX_API}/launches/query`, {
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
    });
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
    const result = await fetchJson<unknown>(
      `${LL2_API}/launches/upcoming/?limit=${boundedLimit}&mode=normal`,
      {
        headers: getLL2Headers(),
        next: { revalidate: 1800 },
      },
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
    const result = await fetchJson<unknown>(
      `${LL2_API}/launches/previous/?limit=${boundedLimit}&mode=normal`,
      {
        headers: getLL2Headers(),
        next: { revalidate: 3600 },
      },
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
    const result = await fetchJson<unknown>(
      `${LL2_API}/launches/${encodeURIComponent(sourceId)}/?mode=detailed`,
      {
        headers: getLL2Headers(),
        next: { revalidate: 1800 },
      },
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
  if (!url) {
    return null;
  }

  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/live\/)([^&?/]+)/
  );

  if (!match?.[1]) {
    return null;
  }

  return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
}

function mediaUrl(media: LL2Media | string | null | undefined): string | null {
  if (typeof media === 'string') {
    return media || null;
  }
  return typeof media?.image_url === 'string' ? media.image_url || null : null;
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

function ll2Videos(launch: LL2Launch): LL2Video[] {
  const candidates = [
    ...(Array.isArray(launch.vid_urls) ? launch.vid_urls : []),
    ...(Array.isArray(launch.vidURLs) ? launch.vidURLs : []),
    ...(Array.isArray(launch.mission?.vid_urls) ? launch.mission.vid_urls : []),
  ];
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (!candidate?.url || seen.has(candidate.url)) {
      return false;
    }
    seen.add(candidate.url);
    return true;
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

function mapLaunchStatus(abbrev: string): Launch['status'] {
  switch (abbrev) {
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

const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export interface ParsedLaunchId {
  source: LaunchSource;
  sourceId: string;
  canonicalId: string;
  legacy: boolean;
}

export function toCanonicalLaunchId(source: LaunchSource, sourceId: string): string {
  return `${source}-${sourceId}`;
}

export function parseLaunchId(value: string | null | undefined): ParsedLaunchId | null {
  const id = value?.trim();
  if (!id || id.length > 140) {
    return null;
  }

  const legacyMatch = id.match(/^past-(.+)$/);
  if (legacyMatch?.[1] && SOURCE_ID_PATTERN.test(legacyMatch[1])) {
    return {
      source: 'spacex',
      sourceId: legacyMatch[1],
      canonicalId: toCanonicalLaunchId('spacex', legacyMatch[1]),
      legacy: true,
    };
  }

  const match = id.match(/^(spacex|ll2)-(.+)$/);
  if (!match?.[1] || !match[2] || !SOURCE_ID_PATTERN.test(match[2])) {
    return null;
  }

  const source = match[1] as LaunchSource;
  return {
    source,
    sourceId: match[2],
    canonicalId: toCanonicalLaunchId(source, match[2]),
    legacy: false,
  };
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
  const rocket = typeof launch.rocket === 'object'
    ? launch.rocket.name || 'Unknown Rocket'
    : launch.rocket || 'Unknown Rocket';
  const launchSite = typeof launch.launchpad === 'object'
    ? launch.launchpad.name || launch.launchpad.full_name || 'Unknown Site'
    : launch.launchpad || 'Unknown Site';
  const webcast = launch.links.webcast || null;
  const image = launch.links.flickr?.original?.[0] || null;

  return {
    id: toCanonicalLaunchId('spacex', launch.id),
    sourceId: launch.id,
    name: launch.name,
    date: launch.date_utc,
    dateUnix: launch.date_unix,
    rocket,
    launchSite,
    status,
    statusName,
    missionName: launch.name,
    livestream: webcast,
    livestreams: webcast ? [{
      url: webcast,
      title: launch.upcoming ? 'Official webcast' : 'Recorded webcast',
      isLive: false,
      thumbnail: buildYouTubeThumbnail(webcast),
    }] : null,
    description: launch.details,
    isLive: false,
    webcastLive: false,
    image,
    missionPatch: launch.links.patch?.small || null,
    rocketImageUrl: null,
    launchImageUrl: image,
    padMapImage: null,
    location: null,
    provider: 'SpaceX',
    providerLogo: null,
    program: null,
    timeline: null,
    videoThumbnail: buildYouTubeThumbnail(webcast),
    source: 'spacex',
    ll2Id: null,
    orbit: null,
    rocketFamily: rocket,
    rocketVariant: null,
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
  const sourceStatus = mapLaunchStatus(launch.status.abbrev);
  const isLive =
    Boolean(launch.webcast_live) ||
    sourceStatus === 'live' ||
    livestreams.some((stream) => stream.isLive);
  const parsedDate = new Date(launch.net).getTime() / 1000;
  const rocketImage = mediaUrl(configuration.image) || mediaUrl(configuration.image_url);
  const launchImage = mediaUrl(launch.image);
  const missionImage = mediaUrl(launch.mission?.image);
  const family = ll2RocketFamily(launch);
  const missionPatch = (Array.isArray(launch.mission_patches) ? launch.mission_patches : [])
    .find((patch) => typeof patch?.image_url === 'string' && patch.image_url.length > 0)
    ?.image_url || null;
  const countryCode =
    launch.pad.location?.country_code ||
    launch.pad.country?.alpha_2_code ||
    launch.pad.location?.country?.alpha_2_code ||
    undefined;

  return {
    id: toCanonicalLaunchId('ll2', launch.id),
    sourceId: launch.id,
    name: launch.name,
    date: launch.net,
    dateUnix: Number.isFinite(parsedDate) ? parsedDate : 0,
    rocket: configuration.name || 'Unknown Rocket',
    launchSite: launch.pad.name || 'Unknown Site',
    status: isLive ? 'live' : sourceStatus,
    statusName: launch.status.name || launch.status.abbrev || null,
    missionName: isMeaningfulLaunchValue(launch.mission?.name)
      ? launch.mission.name.trim()
      : null,
    missionType: isMeaningfulLaunchValue(launch.mission?.type)
      ? launch.mission.type.trim()
      : null,
    windowStart: launch.window_start || null,
    windowEnd: launch.window_end || null,
    livestream: livestreams?.[0]?.url || null,
    livestreams: livestreams.length > 0 ? livestreams : null,
    description: launch.mission?.description || null,
    isLive,
    webcastLive: Boolean(launch.webcast_live),
    image: launchImage || missionImage || rocketImage,
    missionPatch,
    rocketImageUrl: rocketImage,
    launchImageUrl: launchImage || missionImage,
    padMapImage: mediaUrl(launch.pad.map_image) || mediaUrl(launch.pad.image),
    location: Number.isFinite(latitude) && Number.isFinite(longitude) ? {
      lat: latitude,
      lng: longitude,
      name: launch.pad.location?.name || launch.pad.name || 'Unknown Site',
      countryCode,
    } : null,
    provider: provider.name,
    providerLogo: provider.logo,
    program: isMeaningfulLaunchValue(
      (Array.isArray(launch.program) ? launch.program : [])[0]?.name
    )
      ? (Array.isArray(launch.program) ? launch.program : [])[0]!.name.trim()
      : null,
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
    videoThumbnail: livestreams?.[0]?.thumbnail || null,
    source: 'll2',
    ll2Id: launch.id,
    orbit: isMeaningfulLaunchValue(launch.mission?.orbit?.name)
      ? launch.mission.orbit.name.trim()
      : null,
    rocketFamily: family,
    rocketVariant: configuration.variant || null,
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

export async function getAllUpcomingLaunchesResult(): Promise<LaunchFeedResult<Launch[]>> {
  return withInFlightDedupe('feed:upcoming', async () => {
    const [spacex, ll2] = await Promise.all([
      getSpaceXUpcomingLaunchesWithMeta(),
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
        (launch.isLive || launch.dateUnix >= nowUnix) &&
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
      getSpaceXPastLaunchesWithMeta(boundedLimit),
      getLL2PastLaunchesWithMeta(boundedLimit),
    ]);
    const nowUnix = Date.now() / 1000;
    const launches = dedupeLaunches([
      ...spacex.data.map(normalizeSpaceXLaunch),
      ...ll2.data.map(normalizeLL2Launch),
    ])
      .filter((launch) => (
        Number.isFinite(launch.dateUnix) &&
        launch.dateUnix < nowUnix
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
