import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLL2UpcomingLaunches,
  getLaunchByIdResult,
  normalizeLL2Launch,
} from '@/lib/api';
import type { LL2Launch } from '@/lib/types';

const NORMAL_LIST_LAUNCH = {
  id: '8b8a30c5-12b5-4a37-bbea-160d90ec65e5',
  name: 'Falcon 9 Block 5 | Fixture Mission',
  net: '2035-07-29T02:00:00Z',
  window_start: '2035-07-29T02:00:00Z',
  window_end: '2035-07-29T06:00:00Z',
  status: {
    id: 1,
    name: 'Go for Launch',
    abbrev: 'Go',
    description: 'Current T-0 confirmed by official sources.',
  },
  launch_service_provider: {
    name: 'SpaceX',
  },
  rocket: {
    id: 9089,
    configuration: {
      id: 164,
      name: 'Falcon 9',
      full_name: 'Falcon 9 Block 5',
      families: [
        { id: 1, name: 'Falcon' },
        { id: 176, name: 'Falcon 9' },
      ],
      variant: 'Block 5',
    },
  },
  mission: {
    name: 'Fixture Mission',
    type: 'Communications',
    description: 'A realistic LL2 2.3 normal-mode fixture.',
    orbit: {
      name: 'Low Earth Orbit',
      abbrev: 'LEO',
    },
    vid_urls: [],
  },
  pad: {
    id: 16,
    name: 'Space Launch Complex 4E',
    latitude: 34.632,
    longitude: -120.611,
    country: {
      alpha_2_code: 'US',
    },
    location: {
      name: 'Vandenberg SFB, CA, USA',
    },
    image: {
      image_url: 'https://example.test/pad.jpg',
      thumbnail_url: 'https://example.test/pad-thumb.jpg',
    },
    map_image: 'https://example.test/pad-map.jpg',
  },
  webcast_live: false,
  vid_urls: null,
  timeline: null,
  image: {
    image_url: 'https://example.test/launch.jpg',
    thumbnail_url: 'https://example.test/launch-thumb.jpg',
  },
  program: [{ name: 'Fixture Program' }],
} satisfies LL2Launch;

const DETAILED_LAUNCH = {
  ...NORMAL_LIST_LAUNCH,
  id: 'f83f7f2c-e9f5-4af2-b5cc-5c9416b19ca6',
  launch_service_provider: {
    name: 'SpaceX',
    logo: {
      image_url: 'https://example.test/spacex-logo.png',
      thumbnail_url: 'https://example.test/spacex-logo-thumb.png',
    },
  },
  rocket: {
    id: 9089,
    configuration: {
      ...NORMAL_LIST_LAUNCH.rocket.configuration,
      image: {
        image_url: 'https://example.test/falcon-9.jpg',
        thumbnail_url: 'https://example.test/falcon-9-thumb.jpg',
      },
    },
  },
  vid_urls: [
    {
      priority: 10,
      source: 'youtube.com',
      publisher: 'SpaceX',
      title: 'Fixture Mission',
      feature_image: 'https://example.test/webcast.jpg',
      url: 'https://www.youtube.com/watch?v=fixture123',
      type: {
        name: 'Official Webcast',
      },
      start_time: '2035-07-29T01:50:00Z',
      end_time: '2035-07-29T07:50:00Z',
      live: true,
    },
  ],
  timeline: [
    {
      type: {
        abbrev: 'Liftoff',
        description: 'First upward motion of the vehicle.',
      },
      relative_time: 'P0D',
    },
  ],
  mission_patches: [
    {
      priority: 10,
      image_url: 'https://example.test/mission-patch.png',
    },
  ],
} satisfies LL2Launch;

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Launch Library 2.3 adapter', () => {
  it('accepts a normal-mode list payload and requests the supported list mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ count: 1, next: null, previous: null, results: [NORMAL_LIST_LAUNCH] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const launches = await getLL2UpcomingLaunches(7);

    expect(launches).toHaveLength(1);
    expect(launches[0].rocket.configuration.families?.[0]?.name).toBe('Falcon');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=7&mode=normal',
      expect.objectContaining({
        headers: {},
      }),
    );
  });

  it('requests detailed launch data and normalizes 2.3 media, streams, and timeline fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DETAILED_LAUNCH));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getLaunchByIdResult(`ll2-${DETAILED_LAUNCH.id}`);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://ll.thespacedevs.com/2.3.0/launches/${DETAILED_LAUNCH.id}/?mode=detailed`,
      expect.objectContaining({
        headers: {},
      }),
    );
    expect(result.data).toMatchObject({
      id: `ll2-${DETAILED_LAUNCH.id}`,
      rocket: 'Falcon 9',
      rocketFamily: 'Falcon',
      rocketVariant: 'Block 5',
      provider: 'SpaceX',
      providerLogo: 'https://example.test/spacex-logo.png',
      image: 'https://example.test/launch.jpg',
      launchImageUrl: 'https://example.test/launch.jpg',
      rocketImageUrl: 'https://example.test/falcon-9.jpg',
      padMapImage: 'https://example.test/pad-map.jpg',
      missionPatch: 'https://example.test/mission-patch.png',
      livestream: 'https://www.youtube.com/watch?v=fixture123',
      isLive: true,
      status: 'live',
      location: {
        lat: 34.632,
        lng: -120.611,
        name: 'Vandenberg SFB, CA, USA',
        countryCode: 'US',
      },
      timeline: [
        {
          type: 'Liftoff',
          relativeTime: 'P0D',
          description: 'First upward motion of the vehicle.',
        },
      ],
    });
    expect(result.data?.livestreams?.[0]).toMatchObject({
      source: 'youtube.com',
      type: 'Official Webcast',
      thumbnail: 'https://example.test/webcast.jpg',
      isLive: true,
    });
  });

  it('retains compatibility with LL2 2.2 field names', () => {
    const legacyLaunch: LL2Launch = {
      id: 'legacy-fixture',
      name: 'Electron | Legacy Fixture',
      net: '2035-08-01T12:00:00Z',
      status: {
        id: 1,
        name: 'Go for Launch',
        abbrev: 'Go',
      },
      rocket: {
        id: 42,
        configuration: {
          id: 26,
          name: 'Electron',
          family: 'Electron',
          variant: 'KS',
          image_url: 'https://example.test/electron.jpg',
        },
      },
      pad: {
        id: 210,
        name: 'Launch Complex 1',
        latitude: '-39.260881',
        longitude: '177.864876',
        location: {
          name: 'Mahia, New Zealand',
          country_code: 'NZ',
        },
        map_image: 'https://example.test/legacy-map.jpg',
      },
      launch_service_provider: {
        name: 'Rocket Lab',
        logo_url: 'https://example.test/rocket-lab-logo.png',
      },
      webcast_live: false,
      vidURLs: [
        {
          url: 'https://www.youtube.com/watch?v=legacy123',
          title: 'Legacy webcast',
        },
      ],
      mission: {
        name: 'Legacy Fixture',
        description: 'A 2.2 compatibility fixture.',
        type: 'Technology',
      },
      timeline: [
        {
          type: { name: 'Liftoff' },
          relative_time: 'P0D',
          description: 'Vehicle clears the pad.',
        },
      ],
      image: 'https://example.test/legacy-launch.jpg',
    };

    expect(normalizeLL2Launch(legacyLaunch)).toMatchObject({
      provider: 'Rocket Lab',
      providerLogo: 'https://example.test/rocket-lab-logo.png',
      rocketFamily: 'Electron',
      livestream: 'https://www.youtube.com/watch?v=legacy123',
      launchImageUrl: 'https://example.test/legacy-launch.jpg',
      location: {
        lat: -39.260881,
        lng: 177.864876,
        countryCode: 'NZ',
      },
    });
  });
});
