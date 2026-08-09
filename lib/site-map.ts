import type { LaunchLocation } from '@/lib/types';

const SITE_MAP_ZOOM = 12;

function validCoordinate(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function urlCoordinate(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  return Number.parseFloat(normalized.toFixed(6)).toString();
}

/** Build a marker-centered OpenStreetMap handoff for provider-reported pads. */
export function buildReportedSiteMapUrl(
  location: LaunchLocation | null | undefined
): string | null {
  if (
    !location ||
    !validCoordinate(location.lat, -90, 90) ||
    !validCoordinate(location.lng, -180, 180)
  ) {
    return null;
  }

  const latitude = urlCoordinate(location.lat);
  const longitude = urlCoordinate(location.lng);
  const url = new URL('https://www.openstreetmap.org/');
  url.searchParams.set('mlat', latitude);
  url.searchParams.set('mlon', longitude);
  url.hash = `map=${SITE_MAP_ZOOM}/${latitude}/${longitude}`;
  return url.toString();
}
