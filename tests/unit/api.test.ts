import { describe, expect, it } from 'vitest';
import {
  normalizeSpaceXLaunch,
  parseLaunchId,
  toCanonicalLaunchId,
} from '@/lib/api';
import type { SpaceXLaunch } from '@/lib/types';

describe('canonical launch identifiers', () => {
  it('creates and parses provider-scoped IDs', () => {
    const id = toCanonicalLaunchId('ll2', 'mission_123');

    expect(id).toBe('ll2-mission_123');
    expect(parseLaunchId(id)).toEqual({
      source: 'll2',
      sourceId: 'mission_123',
      canonicalId: id,
      legacy: false,
    });
  });

  it('keeps legacy historical links compatible', () => {
    expect(parseLaunchId('past-demo-return')).toEqual({
      source: 'spacex',
      sourceId: 'demo-return',
      canonicalId: 'spacex-demo-return',
      legacy: true,
    });
  });

  it.each([
    '',
    'unknown-demo',
    'll2-',
    'spacex-has spaces',
    `ll2-${'x'.repeat(129)}`,
  ])('rejects malformed ID %j', (id) => {
    expect(parseLaunchId(id)).toBeNull();
  });
});

describe('SpaceX normalization', () => {
  it('normalizes provider fields and historical outcome', () => {
    const launch: SpaceXLaunch = {
      id: 'demo-return',
      name: 'Demo Return Flight',
      date_utc: '2025-04-14T18:00:00.000Z',
      date_unix: 1744653600,
      rocket: {
        id: 'f9',
        name: 'Falcon 9',
        flickr_images: ['https://example.test/falcon-9.jpg'],
      },
      success: true,
      details: 'Nominal mission.',
      links: {
        webcast: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        youtube_id: 'aqz-KE-bpKQ',
        article: null,
        wikipedia: null,
        flickr: {
          original: ['https://example.test/demo-return.jpg'],
        },
        patch: { small: 'https://example.test/patch.png' },
      },
      launchpad: {
        id: '39a',
        name: 'LC-39A',
        full_name: 'Kennedy Space Center',
        latitude: 28.6080585,
        longitude: -80.6039558,
        locality: 'Cape Canaveral',
        region: 'Florida',
      },
      upcoming: false,
    };

    const normalized = normalizeSpaceXLaunch(launch);

    expect(normalized).toMatchObject({
      id: 'spacex-demo-return',
      sourceId: 'demo-return',
      source: 'spacex',
      status: 'success',
      provider: 'SpaceX',
      rocket: 'Falcon 9',
      launchSite: 'LC-39A',
      location: {
        lat: 28.6080585,
        lng: -80.6039558,
        name: 'Cape Canaveral, Florida',
      },
      livestream: launch.links.webcast,
      rocketImageUrl: 'https://example.test/falcon-9.jpg',
      launchImageUrl: 'https://example.test/demo-return.jpg',
      vehicleVisual: {
        kind: 'vehicle',
        url: 'https://example.test/falcon-9.jpg',
        credit: 'SpaceX',
        sourceLabel: 'SpaceX API',
        sourceUrl: 'https://api.spacexdata.com/v4/rockets/f9',
      },
      missionVisual: {
        kind: 'mission',
        url: 'https://example.test/demo-return.jpg',
        credit: 'SpaceX',
        sourceLabel: 'SpaceX API',
        sourceUrl: 'https://api.spacexdata.com/v4/launches/demo-return',
      },
    });
    expect(normalized.vehicleVisual).not.toHaveProperty('licenseName');
    expect(normalized.missionVisual).not.toHaveProperty('licenseUrl');
  });

  it('accepts numeric coordinate strings and meaningful launchpad fallbacks', () => {
    const launch: SpaceXLaunch = {
      id: 'fallback-pad',
      name: 'Fallback Pad Flight',
      date_utc: '2026-08-01T12:00:00.000Z',
      date_unix: 1785585600,
      rocket: 'falcon-9',
      success: null,
      details: null,
      links: {
        webcast: null,
        youtube_id: null,
        article: null,
        wikipedia: null,
      },
      launchpad: {
        id: 'vafb-slc-4e',
        name: 'Unknown Site',
        full_name: 'Vandenberg Space Force Base Space Launch Complex 4E',
        latitude: '34.632093',
        longitude: '-120.610829',
        locality: 'Vandenberg Space Force Base',
        region: 'California',
      },
      upcoming: true,
    };

    expect(normalizeSpaceXLaunch(launch)).toMatchObject({
      launchSite: 'Vandenberg Space Force Base Space Launch Complex 4E',
      location: {
        lat: 34.632093,
        lng: -120.610829,
        name: 'Vandenberg Space Force Base, California',
      },
    });
  });

  it.each([
    {
      label: 'an unpopulated launchpad',
      launchpad: '39a',
    },
    {
      label: 'a missing coordinate',
      launchpad: {
        id: '39a',
        name: 'LC-39A',
        latitude: 28.6080585,
        longitude: null,
      },
    },
    {
      label: 'non-numeric coordinates',
      launchpad: {
        id: '39a',
        name: 'LC-39A',
        latitude: 'not-a-number',
        longitude: -80.6039558,
      },
    },
    {
      label: 'out-of-range coordinates',
      launchpad: {
        id: '39a',
        name: 'LC-39A',
        latitude: 91,
        longitude: -181,
      },
    },
  ] satisfies Array<{ label: string; launchpad: SpaceXLaunch['launchpad'] }>)(
    'keeps location null for $label',
    ({ launchpad }) => {
      const launch: SpaceXLaunch = {
        id: 'no-location',
        name: 'No Location Flight',
        date_utc: '2026-08-01T12:00:00.000Z',
        date_unix: 1785585600,
        rocket: 'falcon-9',
        success: null,
        details: null,
        links: {
          webcast: null,
          youtube_id: null,
          article: null,
          wikipedia: null,
        },
        launchpad,
        upcoming: true,
      };

      expect(normalizeSpaceXLaunch(launch).location).toBeNull();
    },
  );
});
