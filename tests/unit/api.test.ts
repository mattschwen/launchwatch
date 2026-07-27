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
      rocket: { id: 'f9', name: 'Falcon 9' },
      success: true,
      details: 'Nominal mission.',
      links: {
        webcast: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        youtube_id: 'aqz-KE-bpKQ',
        article: null,
        wikipedia: null,
        patch: { small: 'https://example.test/patch.png' },
      },
      launchpad: {
        id: '39a',
        name: 'LC-39A',
        full_name: 'Kennedy Space Center',
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
      livestream: launch.links.webcast,
    });
  });
});
