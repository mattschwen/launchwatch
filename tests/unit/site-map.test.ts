import { describe, expect, it } from 'vitest';
import { buildReportedSiteMapUrl } from '@/lib/site-map';

describe('reported site map links', () => {
  it('builds a marker-centered OpenStreetMap URL from valid coordinates', () => {
    expect(
      buildReportedSiteMapUrl({
        lat: 28.5619,
        lng: -80.5774,
        name: 'Cape Canaveral',
      })
    ).toBe(
      'https://www.openstreetmap.org/?mlat=28.5619&mlon=-80.5774#map=12/28.5619/-80.5774'
    );
  });

  it('normalizes coordinate precision and negative zero', () => {
    expect(
      buildReportedSiteMapUrl({
        lat: -0,
        lng: 12.123456789,
        name: 'Precision test',
      })
    ).toBe(
      'https://www.openstreetmap.org/?mlat=0&mlon=12.123457#map=12/0/12.123457'
    );
  });

  it.each([
    null,
    undefined,
    { lat: Number.NaN, lng: 0, name: 'Invalid latitude' },
    { lat: 91, lng: 0, name: 'Latitude outside Earth' },
    { lat: 0, lng: -181, name: 'Longitude outside Earth' },
  ])('does not build a handoff for invalid coordinates', (location) => {
    expect(buildReportedSiteMapUrl(location)).toBeNull();
  });
});
