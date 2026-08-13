import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAllUpcomingLaunchesResult,
  getLL2UpcomingLaunches,
  getLaunchByIdResult,
  getPastLaunchesResult,
  normalizeLL2Launch,
} from '@/lib/api';
import type { LL2Launch } from '@/lib/types';

const NORMAL_LIST_LAUNCH = {
  id: '8b8a30c5-12b5-4a37-bbea-160d90ec65e5',
  name: 'Falcon 9 Block 5 | Fixture Mission',
  launch_designator: null,
  last_updated: '2035-07-29T01:13:00Z',
  orbital_launch_attempt_count_year: 132,
  agency_launch_attempt_count_year: 41,
  pad_launch_attempt_count_year: 19,
  pad_turnaround: null,
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
      maiden_flight: null,
      total_launch_count: null,
      successful_launches: null,
      failed_launches: null,
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
    agencies: [
      {
        name: 'European Organisation for the Exploitation of Meteorological Satellites',
        abbrev: 'EUMETSAT',
        type: { name: 'Multinational' },
      },
    ],
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
      timezone_name: 'America/Los_Angeles',
    },
    image: {
      image_url: 'https://example.test/pad.jpg',
      thumbnail_url: 'https://example.test/pad-thumb.jpg',
    },
    map_image: 'https://example.test/pad-map.jpg',
  },
  webcast_live: false,
  probability: 85,
  weather_concerns: 'Cumulus Cloud Rule',
  holdreason: null,
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
  launch_designator: '2035-132',
  pad_turnaround: 'P3DT17H6M',
  flightclub_url:
    'https://flightclub.io/result?llId=f83f7f2c-e9f5-4af2-b5cc-5c9416b19ca6',
  info_urls: [
    {
      priority: 10,
      source: 'spacex.com',
      title: 'Fixture mission',
      url: 'https://www.spacex.com/launches/fixture-mission',
      type: { name: 'Official Page' },
    },
  ],
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
      maiden_flight: '2018-05-11',
      total_launch_count: 620,
      successful_launches: 619,
      failed_launches: 1,
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
  updates: [
    {
      id: 4102,
      comment: 'Now targeting Jul 29 at 02:00 UTC.',
      info_url: 'https://example.test/mission-update',
      created_on: '2035-07-27T18:42:00Z',
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

function windowFixture(
  id: string,
  now: number,
  netOffsetMinutes: number,
  endOffsetMinutes: number,
): LL2Launch {
  return {
    ...NORMAL_LIST_LAUNCH,
    id,
    name: `${id} mission`,
    net: new Date(now + netOffsetMinutes * 60 * 1000).toISOString(),
    window_start: new Date(
      now + (netOffsetMinutes - 30) * 60 * 1000,
    ).toISOString(),
    window_end: new Date(now + endOffsetMinutes * 60 * 1000).toISOString(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Launch Library 2.3 adapter', () => {
  it('preserves a bounded provider launch designator and rejects malformed values', () => {
    expect(normalizeLL2Launch(DETAILED_LAUNCH).launchDesignator).toBe(
      '2035-132',
    );
    expect(
      normalizeLL2Launch({
        ...DETAILED_LAUNCH,
        launch_designator: ' 2035-132 ',
      }).launchDesignator,
    ).toBe('2035-132');

    for (const launch_designator of [
      '2035 132',
      '2035_132',
      'x'.repeat(33),
      '',
    ]) {
      expect(
        normalizeLL2Launch({ ...DETAILED_LAUNCH, launch_designator })
          .launchDesignator,
      ).toBeNull();
    }
  });

  it('preserves every distinct provider program affiliation', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      program: [
        { name: ' Commercial Crew Program ' },
        { name: 'International Space Station' },
        { name: 'commercial crew program' },
        { name: 'N/A' },
      ],
    });

    expect(normalized.program).toBe('Commercial Crew Program');
    expect(normalized.programs).toEqual([
      'Commercial Crew Program',
      'International Space Station',
    ]);
  });

  it('preserves safe provider-curated mission resources', () => {
    const normalized = normalizeLL2Launch(DETAILED_LAUNCH);

    expect(normalized).toMatchObject({
      officialMissionUrl:
        'https://www.spacex.com/launches/fixture-mission',
      trajectorySimulationUrl:
        'https://flightclub.io/result?llId=f83f7f2c-e9f5-4af2-b5cc-5c9416b19ca6',
    });
  });

  it('rejects unsafe, mislabeled, and non-FlightClub resource URLs', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      flightclub_url: 'https://example.test/flightclub-lookalike',
      info_urls: [
        {
          url: 'javascript:alert(document.domain)',
          type: { name: 'Official Page' },
        },
        {
          url: 'https://example.test/community-post',
          type: { name: 'Community' },
        },
      ],
    });

    expect(normalized.officialMissionUrl).toBeNull();
    expect(normalized.trajectorySimulationUrl).toBeNull();
  });

  it('preserves a valid launch-site time zone and rejects malformed zones', () => {
    expect(normalizeLL2Launch(NORMAL_LIST_LAUNCH).location).toMatchObject({
      timeZone: 'America/Los_Angeles',
    });

    const malformed = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      pad: {
        ...NORMAL_LIST_LAUNCH.pad,
        location: {
          ...NORMAL_LIST_LAUNCH.pad.location,
          timezone_name: 'Mars/Olympus_Mons',
        },
      },
    });
    expect(malformed.location).not.toHaveProperty('timeZone');
  });

  it('normalizes a bounded newest-first provider update log and rejects unsafe entries', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      updates: [
        ...DETAILED_LAUNCH.updates,
        {
          id: 4103,
          comment: 'GO for launch.',
          info_url: 'https://example.test/go-status',
          created_on: '2035-07-28T09:15:00Z',
        },
        {
          id: 4104,
          comment: '  ',
          info_url: 'https://example.test/blank',
          created_on: '2035-07-28T10:00:00Z',
        },
        {
          id: 4105,
          comment: 'Source URL is unsafe but the provider note remains useful.',
          info_url: 'javascript:alert(document.domain)',
          created_on: '2035-07-28T08:00:00Z',
        },
        {
          id: 4106,
          comment: 'Malformed timestamps cannot be represented honestly.',
          info_url: 'https://example.test/malformed-time',
          created_on: 'not-a-date',
        },
      ],
    });

    expect(normalized.providerUpdates).toEqual([
      {
        id: '4103',
        comment: 'GO for launch.',
        sourceUrl: 'https://example.test/go-status',
        createdAt: '2035-07-28T09:15:00.000Z',
      },
      {
        id: '4105',
        comment: 'Source URL is unsafe but the provider note remains useful.',
        sourceUrl: null,
        createdAt: '2035-07-28T08:00:00.000Z',
      },
      {
        id: '4102',
        comment: 'Now targeting Jul 29 at 02:00 UTC.',
        sourceUrl: 'https://example.test/mission-update',
        createdAt: '2035-07-27T18:42:00.000Z',
      },
    ]);
  });

  it('limits provider updates to the latest five notes', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      updates: Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        comment: `Provider note ${index + 1}`,
        created_on: new Date(
          Date.UTC(2035, 6, 20 + index),
        ).toISOString(),
      })),
    });

    expect(normalized.providerUpdates).toHaveLength(5);
    expect(normalized.providerUpdates?.map((update) => update.id)).toEqual([
      '8',
      '7',
      '6',
      '5',
      '4',
    ]);
  });

  it('preserves distinct provider mission operators and rejects placeholders', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      mission: {
        ...NORMAL_LIST_LAUNCH.mission,
        agencies: [
          ...NORMAL_LIST_LAUNCH.mission.agencies,
          {
            name: 'european organisation for the exploitation of meteorological satellites',
            abbrev: 'Duplicate',
            type: { name: 'Multinational' },
          },
          { name: 'N/A', abbrev: 'TBD', type: { name: 'Unknown' } },
          { name: 'National Aeronautics and Space Administration', abbrev: 'NASA' },
        ],
      },
    });

    expect(normalized.missionAgencies).toEqual([
      {
        name: 'European Organisation for the Exploitation of Meteorological Satellites',
        abbrev: 'EUMETSAT',
        type: 'Multinational',
      },
      {
        name: 'National Aeronautics and Space Administration',
        abbrev: 'NASA',
        type: null,
      },
    ]);
  });

  it('preserves the provider record revision time', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      last_updated: '2035-07-29T01:13:00Z',
    } as LL2Launch & { last_updated: string });

    expect(normalized).toMatchObject({
      providerUpdatedAt: '2035-07-29T01:13:00.000Z',
    });
  });

  it('preserves positive yearly provider attempt ordinals', () => {
    const normalized = normalizeLL2Launch(NORMAL_LIST_LAUNCH);

    expect(normalized).toMatchObject({
      orbitalLaunchAttemptCountYear: 132,
      providerLaunchAttemptCountYear: 41,
      padLaunchAttemptCountYear: 19,
    });

    const malformed = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      orbital_launch_attempt_count_year: 0,
      agency_launch_attempt_count_year: -1,
      pad_launch_attempt_count_year: 4.5,
    });
    expect(malformed.orbitalLaunchAttemptCountYear).toBeNull();
    expect(malformed.providerLaunchAttemptCountYear).toBeNull();
    expect(malformed.padLaunchAttemptCountYear).toBeNull();
  });

  it('preserves a bounded detailed pad turnaround duration', () => {
    expect(normalizeLL2Launch(DETAILED_LAUNCH).padTurnaroundSeconds).toBe(
      3 * 86_400 + 17 * 3_600 + 6 * 60,
    );

    for (const pad_turnaround of [
      'P0D',
      'PT0S',
      'P1M',
      'P1Y',
      'P1DT',
      'PT25H',
      'PT60M',
      '3 days',
      'P999999D',
    ]) {
      expect(
        normalizeLL2Launch({ ...DETAILED_LAUNCH, pad_turnaround })
          .padTurnaroundSeconds,
      ).toBeNull();
    }
  });

  it('drops malformed provider revision times', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      last_updated: 'not-a-timestamp',
    });

    expect(normalized.providerUpdatedAt).toBeNull();
  });

  it('preserves provider launch probability and readiness constraints', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      holdreason: 'Range clearance pending',
    });

    expect(normalized).toMatchObject({
      launchProbability: 85,
      weatherConcerns: 'Cumulus Cloud Rule',
      holdReason: 'Range clearance pending',
    });
  });

  it('preserves a bounded provider diagnosis only for failed launches', () => {
    const failed = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      status: {
        id: 4,
        name: 'Launch Failure',
        abbrev: 'Failure',
        description: 'The launch vehicle did not reach orbit.',
      },
      failreason: 'Launch vehicle disintegrated while passing Max-Q.',
    } as LL2Launch & { failreason: string });
    const successful = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      failreason: 'Stale provider diagnosis.',
    } as LL2Launch & { failreason: string });
    const oversized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      status: {
        id: 4,
        name: 'Launch Failure',
        abbrev: 'Failure',
        description: 'The launch vehicle did not reach orbit.',
      },
      failreason: 'x'.repeat(501),
    } as LL2Launch & { failreason: string });

    expect(failed.failureReason).toBe(
      'Launch vehicle disintegrated while passing Max-Q.',
    );
    expect(successful.failureReason).toBeNull();
    expect(oversized.failureReason).toBeNull();
  });

  it('preserves provider-confirmed first-stage reuse and recovery details', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      rocket: {
        ...DETAILED_LAUNCH.rocket,
        launcher_stage: [
          {
            type: 'Core',
            reused: true,
            launcher_flight_number: 18,
            launcher: {
              serial_number: 'B1085',
            },
            landing: {
              attempt: true,
              success: null,
              landing_location: {
                name: 'A Shortfall of Gravitas',
                abbrev: 'ASOG',
              },
              type: {
                name: 'Autonomous Spaceport Drone Ship',
                abbrev: 'ASDS',
              },
            },
          },
        ],
      },
    } as LL2Launch);

    expect((normalized as unknown as { firstStage?: unknown }).firstStage).toEqual({
      serialNumber: 'B1085',
      flightNumber: 18,
      reused: true,
      landingAttempt: true,
      landingSuccess: null,
      landingLocation: 'A Shortfall of Gravitas',
      landingLocationAbbrev: 'ASOG',
      landingType: 'Autonomous Spaceport Drone Ship',
      landingTypeAbbrev: 'ASDS',
    });
  });

  it('does not invent first-stage telemetry from an empty provider stage', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      rocket: {
        ...DETAILED_LAUNCH.rocket,
        launcher_stage: [
          {
            type: 'Core',
            launcher_flight_number: 0,
            launcher: { serial_number: '   ' },
            landing: {},
          },
        ],
      },
    });

    expect(normalized.firstStage).toBeNull();
  });

  it('normalizes confirmed payload deployment as a successful outcome', () => {
    const normalized = normalizeLL2Launch({
      ...NORMAL_LIST_LAUNCH,
      status: {
        id: 9,
        name: 'Payload Deployed',
        abbrev: 'Deployed',
        description: 'Deployment of the payload(s) has been confirmed.',
      },
    });

    expect(normalized).toMatchObject({
      status: 'success',
      statusName: 'Payload Deployed',
      statusDescription: 'Deployment of the payload(s) has been confirmed.',
    });
  });

  it('normalizes only a bounded provider status explanation', () => {
    expect(normalizeLL2Launch(NORMAL_LIST_LAUNCH).statusDescription).toBe(
      'Current T-0 confirmed by official sources.',
    );
    expect(
      normalizeLL2Launch({
        ...NORMAL_LIST_LAUNCH,
        status: {
          ...NORMAL_LIST_LAUNCH.status,
          description: ` ${'x'.repeat(301)} `,
        },
      }).statusDescription,
    ).toBeNull();
  });

  it('accepts a normal-mode list payload and requests the supported list mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ count: 1, next: null, previous: null, results: [NORMAL_LIST_LAUNCH] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const launches = await getLL2UpcomingLaunches(7);

    expect(launches).toHaveLength(1);
    expect(launches[0].rocket.configuration.families?.[0]?.name).toBe('Falcon');
    expect(normalizeLL2Launch(launches[0]).vehicleRecord).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=7&mode=normal',
      expect.objectContaining({
        headers: {},
      }),
    );
  });

  it('reports a malformed provider list as degraded instead of a healthy empty schedule', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      jsonResponse(
        url.includes('api.spacexdata.com')
          ? { docs: [] }
          : { count: 1, results: [{ id: 'incomplete-launch' }] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAllUpcomingLaunchesResult();

    expect(result.data).toEqual([]);
    expect(result.meta.partial).toBe(true);
    expect(result.meta.providers.spacex.state).toBe('ok');
    expect(result.meta.providers.ll2.state).toBe('error');
    expect(result.meta.providers.ll2.error).toBe(
      'Launch Library 2 returned an invalid launch record',
    );
  });

  it('keeps non-terminal missions scheduled until their provider window closes', async () => {
    const now = Date.now();
    const openWindowLaunch = windowFixture(
      'open-window-fixture',
      now,
      -30,
      90,
    );
    const closedWindowLaunch = windowFixture(
      'closed-window-fixture',
      now,
      -180,
      -120,
    );
    const completedWindowLaunch = {
      ...windowFixture('completed-window-fixture', now, -15, 120),
      status: {
        id: 3,
        name: 'Launch Successful',
        abbrev: 'Success',
      },
    } satisfies LL2Launch;
    const fetchMock = vi.fn(async (url: string) =>
      jsonResponse(
        url.includes('api.spacexdata.com')
          ? { docs: [] }
          : {
              count: 3,
              results: [
                closedWindowLaunch,
                completedWindowLaunch,
                openWindowLaunch,
              ],
            },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const upcoming = await getAllUpcomingLaunchesResult();
    const history = await getPastLaunchesResult(99);

    expect(upcoming.data.map((launch) => launch.id)).toEqual([
      'll2-open-window-fixture',
    ]);
    expect(history.data.map((launch) => launch.id)).toEqual([
      'll2-completed-window-fixture',
      'll2-closed-window-fixture',
    ]);
  });

  it('keeps an in-flight provider record out of completed launch history', async () => {
    const completedLaunch = {
      ...NORMAL_LIST_LAUNCH,
      id: 'completed-history-fixture',
      name: 'Completed History Fixture',
      net: '2024-07-29T02:00:00Z',
      status: {
        id: 3,
        name: 'Launch Successful',
        abbrev: 'Success',
      },
    } satisfies LL2Launch;
    const liveLaunch = {
      ...NORMAL_LIST_LAUNCH,
      id: 'active-history-fixture',
      name: 'Active History Fixture',
      net: '2024-07-30T02:00:00Z',
      status: {
        id: 6,
        name: 'In Flight',
        abbrev: 'In Flight',
      },
      webcast_live: true,
    } satisfies LL2Launch;
    const fetchMock = vi.fn(async (url: string) =>
      jsonResponse(
        url.includes('api.spacexdata.com')
          ? { docs: [] }
          : { count: 2, results: [liveLaunch, completedLaunch] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getPastLaunchesResult(100);

    expect(result.data.map((launch) => launch.id)).toEqual([
      'll2-completed-history-fixture',
    ]);
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
      vehicleRecord: {
        maidenFlight: '2018-05-11',
        totalLaunchCount: 620,
        successfulLaunches: 619,
        failedLaunches: 1,
      },
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

  it('rejects incomplete or inconsistent vehicle history while preserving new configurations', () => {
    expect(
      normalizeLL2Launch({
        ...DETAILED_LAUNCH,
        rocket: {
          ...DETAILED_LAUNCH.rocket,
          configuration: {
            ...DETAILED_LAUNCH.rocket.configuration,
            total_launch_count: 5,
            successful_launches: 5,
            failed_launches: 1,
          },
        },
      }).vehicleRecord,
    ).toBeNull();

    expect(
      normalizeLL2Launch({
        ...DETAILED_LAUNCH,
        rocket: {
          ...DETAILED_LAUNCH.rocket,
          configuration: {
            ...DETAILED_LAUNCH.rocket.configuration,
            maiden_flight: '2018-13-40',
            total_launch_count: 0,
            successful_launches: 0,
            failed_launches: 0,
          },
        },
      }).vehicleRecord,
    ).toEqual({
      maidenFlight: null,
      totalLaunchCount: 0,
      successfulLaunches: 0,
      failedLaunches: 0,
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

  it('does not promote coverage scheduled to end before the launch window', () => {
    const normalized = normalizeLL2Launch({
      ...DETAILED_LAUNCH,
      webcast_live: false,
      vid_urls: [
        {
          priority: 20,
          source: 'x.com',
          publisher: 'SpaceX',
          title: 'Expired official webcast',
          url: 'https://x.com/i/broadcasts/expired123',
          type: { name: 'Official Webcast' },
          start_time: '2035-07-28T18:00:00Z',
          end_time: '2035-07-28T23:00:00Z',
          live: false,
        },
        {
          priority: 10,
          source: 'youtube.com',
          publisher: 'SpaceX',
          title: 'Current official webcast',
          url: 'https://www.youtube.com/watch?v=current123',
          type: { name: 'Official Webcast' },
          start_time: '2035-07-29T01:50:00Z',
          end_time: '2035-07-29T07:50:00Z',
          live: false,
        },
      ],
    });

    expect(normalized.livestream).toBe(
      'https://www.youtube.com/watch?v=current123'
    );
    expect(normalized.livestreams?.map((stream) => stream.url)).toEqual([
      'https://www.youtube.com/watch?v=current123',
    ]);
    expect(normalized.isLive).toBe(false);
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
