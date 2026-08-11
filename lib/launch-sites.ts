import type {
  LaunchLocation,
  LaunchSite,
  LaunchSiteAtlasResponse,
  LaunchVisual,
  LL2Media,
} from '@/lib/types';

const LL2_PUBLIC_API = 'https://ll.thespacedevs.com/2.3.0';
const LL2_API = (process.env.LL2_API_BASE_URL || LL2_PUBLIC_API).replace(/\/+$/, '');
const LL2_API_KEY = process.env.LL2_API_KEY || '';
const REGION_RADIUS_KM = 250;
const CACHE_DURATION_MS = 6 * 60 * 60_000;
const STALE_DURATION_MS = 24 * 60 * 60_000;
const SOURCE_URL = 'https://thespacedevs.com/llapi';

interface LL2Pad {
  id?: number | string;
  active?: boolean;
  name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  description?: string | null;
  info_url?: string | null;
  wiki_url?: string | null;
  total_launch_count?: number | null;
  orbital_launch_attempt_count?: number | null;
  image?: LL2Media | null;
  location?: {
    name?: string | null;
    description?: string | null;
    country?: { alpha_2_code?: string | null } | null;
  } | null;
  agencies?: Array<{ name?: string | null; abbrev?: string | null }> | null;
}

interface LL2PadResponse {
  results?: LL2Pad[];
}

interface CacheEntry {
  data: LaunchSite[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<LaunchSiteAtlasResponse>>();

function text(value: unknown, max = 8_000): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeHttpsUrl(value: unknown): string | null {
  const normalized = text(value, 2_000);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function padImage(image: LL2Media | null | undefined): LaunchVisual | null {
  if (!image?.image_url) return null;
  return {
    kind: 'mission',
    url: image.image_url,
    thumbnailUrl: image.thumbnail_url || undefined,
    name: image.name || undefined,
    credit: image.credit || undefined,
    licenseName: image.license?.name || undefined,
    licenseUrl: image.license?.link || undefined,
    singleUse: image.single_use ?? undefined,
    sourceLabel: 'Launch Library 2',
    sourceUrl: SOURCE_URL,
  };
}

export function normalizeLaunchSites(pads: LL2Pad[]): LaunchSite[] {
  const sites = new Map<string, LaunchSite>();
  for (const pad of pads) {
    const id = text(String(pad.id ?? ''), 120);
    const name = text(pad.name, 240);
    const latitude = number(pad.latitude);
    const longitude = number(pad.longitude);
    if (
      !id || !name || latitude === null || longitude === null ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180
    ) continue;

    const agencies = [...new Set((pad.agencies || []).map((agency) =>
      text(agency.name || agency.abbrev, 160)
    ).filter((agency): agency is string => Boolean(agency)))].slice(0, 8);

    sites.set(id, {
      id,
      name,
      active: pad.active !== false,
      latitude,
      longitude,
      locationName: text(pad.location?.name, 240) || 'Location not supplied',
      countryCode: text(pad.location?.country?.alpha_2_code, 8),
      description: text(pad.description),
      locationDescription: text(pad.location?.description),
      infoUrl: safeHttpsUrl(pad.info_url),
      wikiUrl: safeHttpsUrl(pad.wiki_url),
      totalLaunchCount: Math.max(0, Math.trunc(number(pad.total_launch_count) || 0)),
      orbitalLaunchAttemptCount: Math.max(0, Math.trunc(number(pad.orbital_launch_attempt_count) || 0)),
      agencies,
      image: padImage(pad.image),
    });
  }

  return [...sites.values()].sort((a, b) =>
    b.totalLaunchCount - a.totalLaunchCount || a.name.localeCompare(b.name)
  );
}

function cacheKey(location: LaunchLocation): string {
  return `${location.lat.toFixed(2)}:${location.lng.toFixed(2)}`;
}

function padUrl(location: LaunchLocation): string {
  const latDelta = REGION_RADIUS_KM / 111.32;
  const longitudeScale = Math.max(0.25, Math.cos(location.lat * Math.PI / 180));
  const lngDelta = REGION_RADIUS_KM / (111.32 * longitudeScale);
  const params = new URLSearchParams({
    format: 'json',
    limit: '100',
    latitude__gte: Math.max(-90, location.lat - latDelta).toFixed(5),
    latitude__lte: Math.min(90, location.lat + latDelta).toFixed(5),
    longitude__gte: Math.max(-180, location.lng - lngDelta).toFixed(5),
    longitude__lte: Math.min(180, location.lng + lngDelta).toFixed(5),
    ordering: '-total_launch_count',
  });
  return `${LL2_API}/pads/?${params}`;
}

function response(sites: LaunchSite[], cached: boolean, stale: boolean): LaunchSiteAtlasResponse {
  return {
    sites,
    meta: {
      generatedAt: new Date().toISOString(),
      cached,
      stale,
      source: 'launch-library-2',
      sourceUrl: SOURCE_URL,
    },
  };
}

export async function getNearbyLaunchSites(
  location: LaunchLocation
): Promise<LaunchSiteAtlasResponse> {
  const key = cacheKey(location);
  const existing = cache.get(key);
  if (existing && Date.now() - existing.timestamp < CACHE_DURATION_MS) {
    return response(existing.data, true, false);
  }
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const headers: HeadersInit = { Accept: 'application/json' };
      if (LL2_API_KEY) headers.Authorization = `Token ${LL2_API_KEY}`;
      const providerResponse = await fetch(padUrl(location), {
        headers,
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 21_600 },
      });
      if (!providerResponse.ok) throw new Error(`Launch Library 2 returned ${providerResponse.status}`);
      const payload = await providerResponse.json() as LL2PadResponse;
      const sites = normalizeLaunchSites(Array.isArray(payload.results) ? payload.results : []);
      cache.set(key, { data: sites, timestamp: Date.now() });
      return response(sites, false, false);
    } catch (error) {
      if (existing && Date.now() - existing.timestamp < STALE_DURATION_MS) {
        return response(existing.data, true, true);
      }
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, request);
  return request;
}
