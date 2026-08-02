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
  net_precision: {
    name: 'Hour',
    abbrev: 'HR',
    description: 'The T-0 is accurate to the hour.',
  },
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
    id: 2794,
    name: 'Falcon 9 on the pad',
    image_url: 'https://example.test/launch.jpg',
    thumbnail_url: 'https://example.test/launch-thumb.jpg',
    credit: 'SpaceX',
    license: {
      id: 1,
      name: 'Unknown',
      priority: 9,
      link: null,
    },
    single_use: true,
    variants: [],
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
        id: 1736,
        name: 'Falcon 9 liftoff',
        image_url: 'https://example.test/falcon-9.jpg',
        thumbnail_url: 'https://example.test/falcon-9-thumb.jpg',
        credit: 'SpaceX',
        license: {
          id: 5,
          name: 'CC BY-NC 2.0',
          priority: 1,
          link: 'https://creativecommons.org/licenses/by-nc/2.0/',
        },
        single_use: false,
        variants: [
          {
            id: 1,
            type: {
              id: 1,
              name: 'portrait',
            },
            image_url: 'https://example.test/falcon-9-portrait.jpg',
          },
        ],
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
      datePrecision: {
        name: 'Hour',
        abbrev: 'HR',
        description: 'The T-0 is accurate to the hour.',
      },
      rocket: 'Falcon 9',
      rocketFamily: 'Falcon',
      rocketVariant: 'Block 5',
      provider: 'SpaceX',
      providerLogo: 'https://example.test/spacex-logo.png',
      image: 'https://example.test/launch.jpg',
      launchImageUrl: 'https://example.test/launch.jpg',
      rocketImageUrl: 'https://example.test/falcon-9.jpg',
      vehicleVisual: {
        kind: 'vehicle',
        url: 'https://example.test/falcon-9.jpg',
        thumbnailUrl: 'https://example.test/falcon-9-thumb.jpg',
        name: 'Falcon 9 liftoff',
        credit: 'SpaceX',
        licenseName: 'CC BY-NC 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc/2.0/',
        singleUse: false,
        sourceLabel: 'Launch Library 2',
        sourceUrl:
          `https://ll.thespacedevs.com/2.3.0/launches/${DETAILED_LAUNCH.id}/`,
      },
      missionVisual: {
        kind: 'mission',
        url: 'https://example.test/launch.jpg',
        thumbnailUrl: 'https://example.test/launch-thumb.jpg',
        name: 'Falcon 9 on the pad',
        credit: 'SpaceX',
        licenseName: 'Unknown',
        singleUse: true,
        sourceLabel: 'Launch Library 2',
        sourceUrl:
          `https://ll.thespacedevs.com/2.3.0/launches/${DETAILED_LAUNCH.id}/`,
      },
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

  it('prefers official coverage when providers return unofficial streams first', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      id: 'ranked-stream-fixture',
      vid_urls: [
        {
          priority: 8,
          source: 'youtube.com',
          publisher: 'Community relay',
          title: 'Community restream',
          url: 'https://www.youtube.com/watch?v=community123',
          type: { name: 'Unofficial Re-stream' },
          live: true,
        },
        {
          priority: 9,
          source: 'youtube.com',
          publisher: 'News desk',
          title: 'News webcast',
          url: 'https://www.youtube.com/watch?v=news123',
          type: { name: 'Unofficial Webcast' },
          live: true,
        },
        {
          priority: 10,
          source: 'x.com',
          publisher: 'SpaceX',
          title: 'Official mission webcast',
          url: 'https://x.com/i/broadcasts/official123',
          type: { name: 'Official Webcast' },
          live: true,
        },
      ],
    });

    expect(normalized.livestream).toBe(
      'https://x.com/i/broadcasts/official123'
    );
    expect(normalized.livestreams?.map((stream) => stream.type)).toEqual([
      'Official Webcast',
      'Unofficial Webcast',
      'Unofficial Re-stream',
    ]);
  });

  it('drops unsafe coverage URLs before deriving live state', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      webcast_live: false,
      vid_urls: [
        {
          priority: 10,
          title: 'Unsafe scripted coverage',
          url: 'javascript:alert(document.domain)',
          type: { name: 'Official Webcast' },
          live: true,
        },
        {
          priority: 9,
          title: 'Credential-bearing coverage',
          url: 'https://viewer:secret@example.test/stream',
          type: { name: 'Official Webcast' },
          live: true,
        },
      ],
    });

    expect(normalized).toMatchObject({
      livestream: null,
      livestreams: null,
      videoThumbnail: null,
      isLive: false,
      status: 'upcoming',
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

    const normalized = normalizeLL2Launch(legacyLaunch);

    expect(normalized).toMatchObject({
      provider: 'Rocket Lab',
      providerLogo: 'https://example.test/rocket-lab-logo.png',
      rocketFamily: 'Electron',
      livestream: 'https://www.youtube.com/watch?v=legacy123',
      rocketImageUrl: 'https://example.test/electron.jpg',
      launchImageUrl: 'https://example.test/legacy-launch.jpg',
      vehicleVisual: {
        kind: 'vehicle',
        url: 'https://example.test/electron.jpg',
        sourceLabel: 'Launch Library 2',
        sourceUrl: 'https://ll.thespacedevs.com/2.3.0/launches/legacy-fixture/',
      },
      missionVisual: {
        kind: 'mission',
        url: 'https://example.test/legacy-launch.jpg',
        sourceLabel: 'Launch Library 2',
        sourceUrl: 'https://ll.thespacedevs.com/2.3.0/launches/legacy-fixture/',
      },
      location: {
        lat: -39.260881,
        lng: 177.864876,
        countryCode: 'NZ',
      },
    });
    expect(normalized.vehicleVisual).not.toHaveProperty('credit');
    expect(normalized.vehicleVisual).not.toHaveProperty('licenseName');
    expect(normalized.missionVisual).not.toHaveProperty('name');
  });

  it('uses mission media provenance when a launch image is unavailable', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      image: null,
      mission: {
        ...NORMAL_LIST_LAUNCH.mission,
        image: {
          id: 401,
          name: 'Fixture payload in orbit',
          image_url: 'https://example.test/mission.jpg',
          thumbnail_url: 'https://example.test/mission-thumb.jpg',
          credit: 'Fixture Agency',
          license: {
            id: 4,
            name: 'NASA Image and Media Guidelines',
            priority: 0,
            link: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
          },
          single_use: false,
          variants: [],
        },
      },
    });

    expect(normalized.launchImageUrl).toBe('https://example.test/mission.jpg');
    expect(normalized.missionVisual).toEqual({
      kind: 'mission',
      url: 'https://example.test/mission.jpg',
      thumbnailUrl: 'https://example.test/mission-thumb.jpg',
      name: 'Fixture payload in orbit',
      credit: 'Fixture Agency',
      licenseName: 'NASA Image and Media Guidelines',
      licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
      singleUse: false,
      sourceLabel: 'Launch Library 2',
      sourceUrl:
        `https://ll.thespacedevs.com/2.3.0/launches/${NORMAL_LIST_LAUNCH.id}/`,
    });
  });

  it('prefers reusable mission media over an ineligible launch image', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      mission: {
        ...NORMAL_LIST_LAUNCH.mission,
        image: {
          id: 402,
          name: 'Fixture spacecraft integration',
          image_url:
            'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/mission.jpg',
          thumbnail_url:
            'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/mission-thumb.jpg',
          credit: 'Fixture Agency',
          license: {
            id: 5,
            name: 'CC BY 4.0',
            priority: 1,
            link: 'https://creativecommons.org/licenses/by/4.0/',
          },
          single_use: false,
          variants: [],
        },
      },
    });

    expect(normalized.missionVisual).toMatchObject({
      kind: 'mission',
      url:
        'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/mission.jpg',
      credit: 'Fixture Agency',
      licenseName: 'CC BY 4.0',
      singleUse: false,
    });
  });

  it('normalizes placeholder mission metadata to missing values', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      mission: {
        ...NORMAL_LIST_LAUNCH.mission,
        name: 'Unknown',
        type: 'To Be Determined',
        description: 'Details TBD.',
        orbit: {
          name: 'Unknown',
          abbrev: 'N/A',
        },
      },
      program: [{ name: 'N/A' }],
    });

    expect(normalized).toMatchObject({
      missionName: null,
      missionType: null,
      description: null,
      orbit: null,
      program: null,
    });
  });
});
