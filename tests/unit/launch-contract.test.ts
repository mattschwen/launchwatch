import { describe, expect, it } from 'vitest';
import {
  isLaunch,
  isLaunchCollection,
  isLaunchFeedMeta,
  isLaunchIntel,
  isLaunchSiteAtlasResponse,
} from '@/lib/launch-contract';
import {
  FEED_META,
  LAUNCH_INTEL,
  UPCOMING_LAUNCHES,
} from '@/tests/fixtures/launches';

describe('client launch contract', () => {
  it('accepts a normalized launch with canonical provider identity', () => {
    expect(isLaunch(UPCOMING_LAUNCHES[0])).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        livestream: 'https://x.com/i/broadcasts/orbital-dawn',
        livestreams: [
          {
            url: 'https://x.com/i/broadcasts/orbital-dawn',
            title: 'Orbital Dawn official coverage',
          },
        ],
      }),
    ).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        statusDescription:
          'Current T-0 confirmed by official or reliable sources.',
      }),
    ).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        firstStage: {
          serialNumber: 'B1085',
          flightNumber: 18,
          reused: true,
          landingAttempt: true,
          landingSuccess: null,
          landingLocation: 'A Shortfall of Gravitas',
          landingLocationAbbrev: 'ASOG',
          landingType: 'Autonomous Spaceport Drone Ship',
          landingTypeAbbrev: 'ASDS',
        },
      }),
    ).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        orbitalLaunchAttemptCountYear: 132,
        providerLaunchAttemptCountYear: 41,
        padLaunchAttemptCountYear: 19,
        padTurnaroundSeconds: 320_760,
      }),
    ).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        missionAgencies: [
          { name: 'European Space Agency', abbrev: 'ESA', type: 'Multinational' },
        ],
        program: 'Commercial Crew Program',
        programs: ['Commercial Crew Program', 'International Space Station'],
      }),
    ).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        providerUpdates: [
          {
            id: '4103',
            comment: 'GO for launch.',
            createdAt: '2035-07-28T09:15:00.000Z',
            sourceUrl: 'https://example.test/go-status',
          },
        ],
      }),
    ).toBe(true);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        officialMissionUrl: 'https://www.spacex.com/launches/demo',
        trajectorySimulationUrl:
          'https://flightclub.io/result?llId=demo-orbital-dawn',
      }),
    ).toBe(true);
  });

  it('rejects malformed provider status explanations', () => {
    for (const statusDescription of [
      ' Current T-0 is confirmed. ',
      '',
      'x'.repeat(301),
      { text: 'Current T-0 is confirmed.' },
    ]) {
      expect(
        isLaunch({
          ...UPCOMING_LAUNCHES[0],
          statusDescription,
        }),
      ).toBe(false);
    }
  });

  it('rejects unsafe provider mission resources', () => {
    for (const field of [
      'officialMissionUrl',
      'trajectorySimulationUrl',
    ] as const) {
      expect(
        isLaunch({
          ...UPCOMING_LAUNCHES[0],
          [field]: 'javascript:alert(document.domain)',
        }),
      ).toBe(false);
    }
  });

  it('rejects malformed or unsafe provider updates', () => {
    const providerUpdate = {
      id: '4103',
      comment: 'GO for launch.',
      createdAt: '2035-07-28T09:15:00.000Z',
      sourceUrl: 'https://example.test/go-status',
    };

    for (const invalidUpdate of [
      { ...providerUpdate, comment: ' GO for launch. ' },
      { ...providerUpdate, createdAt: 'not-a-date' },
      { ...providerUpdate, sourceUrl: 'javascript:alert(document.domain)' },
    ]) {
      expect(
        isLaunch({
          ...UPCOMING_LAUNCHES[0],
          providerUpdates: [invalidUpdate],
        }),
      ).toBe(false);
    }

    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        providerUpdates: [providerUpdate, providerUpdate],
      }),
    ).toBe(false);
  });

  it('rejects malformed or duplicate mission operators', () => {
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        missionAgencies: [{ name: ' NASA ', abbrev: 'NASA', type: 'Government' }],
      }),
    ).toBe(false);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        missionAgencies: [
          { name: 'European Space Agency', abbrev: 'ESA', type: 'Multinational' },
          { name: 'european space agency', abbrev: null, type: null },
        ],
      }),
    ).toBe(false);
  });

  it('rejects malformed, duplicate, or oversized mission program lists', () => {
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        program: 'Commercial Crew Program',
        programs: ['Commercial Crew Program', 'commercial crew program'],
      }),
    ).toBe(false);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        program: 'International Space Station',
        programs: [' International Space Station '],
      }),
    ).toBe(false);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        program: 'Program 0',
        programs: Array.from({ length: 9 }, (_, index) => `Program ${index}`),
      }),
    ).toBe(false);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        program: 'Commercial Crew Program',
        programs: ['International Space Station'],
      }),
    ).toBe(false);
  });

  it('rejects malformed first-stage provider facts', () => {
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        firstStage: {
          serialNumber: 'B1085',
          flightNumber: -1,
          reused: 'yes',
          landingAttempt: true,
          landingSuccess: null,
          landingLocation: 'A Shortfall of Gravitas',
          landingLocationAbbrev: 'ASOG',
          landingType: 'Autonomous Spaceport Drone Ship',
          landingTypeAbbrev: 'ASDS',
        },
      }),
    ).toBe(false);
  });

  it.each([0, -1, 4.5, Number.NaN])(
    'rejects malformed provider attempt ordinal %s',
    (providerLaunchAttemptCountYear) => {
      expect(
        isLaunch({
          ...UPCOMING_LAUNCHES[0],
          providerLaunchAttemptCountYear,
        }),
      ).toBe(false);
    },
  );

  it.each([0, -1, 4.5, Number.NaN, Number.MAX_SAFE_INTEGER])(
    'rejects malformed pad turnaround %s',
    (padTurnaroundSeconds) => {
      expect(
        isLaunch({
          ...UPCOMING_LAUNCHES[0],
          padTurnaroundSeconds,
        }),
      ).toBe(false);
    },
  );

  it('rejects malformed provider revision timestamps', () => {
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        providerUpdatedAt: 'yesterday afternoon',
      }),
    ).toBe(false);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        providerUpdatedAt: '2035-07-29T01:13:00Z',
      }),
    ).toBe(false);
  });

  it('rejects malformed launch coordinates and time zones', () => {
    for (const location of [
      { ...UPCOMING_LAUNCHES[0].location, lat: 91 },
      { ...UPCOMING_LAUNCHES[0].location, lng: Number.NaN },
      {
        ...UPCOMING_LAUNCHES[0].location,
        timeZone: 'Mars/Olympus_Mons',
      },
    ]) {
      expect(
        isLaunch({
          ...UPCOMING_LAUNCHES[0],
          location,
        }),
      ).toBe(false);
    }
  });

  it.each([
    {
      label: 'invalid target date',
      date: 'not-a-date',
      dateUnix: UPCOMING_LAUNCHES[0].dateUnix,
    },
    {
      label: 'fractional Unix target',
      date: UPCOMING_LAUNCHES[0].date,
      dateUnix: UPCOMING_LAUNCHES[0].dateUnix + 0.5,
    },
    {
      label: 'target date that disagrees with its Unix value',
      date: UPCOMING_LAUNCHES[0].date,
      dateUnix: UPCOMING_LAUNCHES[0].dateUnix + 60,
    },
  ])('rejects a launch with $label', ({ date, dateUnix }) => {
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        date,
        dateUnix,
      }),
    ).toBe(false);
  });

  it.each([-1, 20.5, 101, Number.NaN])(
    'rejects malformed launch probability %s',
    (launchProbability) => {
      expect(
        isLaunch({
          ...UPCOMING_LAUNCHES[0],
          launchProbability,
        }),
      ).toBe(false);
    },
  );

  it('rejects non-text readiness constraints', () => {
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        weatherConcerns: ['Cumulus Cloud Rule'],
      }),
    ).toBe(false);
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        holdReason: { reason: 'Range clearance pending' },
      }),
    ).toBe(false);
  });

  it('accepts a bounded failure diagnosis only for failed missions', () => {
    expect(
      isLaunch({
        ...UPCOMING_LAUNCHES[0],
        status: 'failure',
        failureReason: 'Vehicle lost during ascent.',
      }),
    ).toBe(true);

    for (const launch of [
      { ...UPCOMING_LAUNCHES[0], failureReason: 'Vehicle lost during ascent.' },
      {
        ...UPCOMING_LAUNCHES[0],
        status: 'failure',
        failureReason: ' Vehicle lost during ascent. ',
      },
      {
        ...UPCOMING_LAUNCHES[0],
        status: 'failure',
        failureReason: 'x'.repeat(501),
      },
    ]) {
      expect(isLaunch(launch)).toBe(false);
    }
  });

  it.each([
    {
      label: 'unqualified ID',
      launch: { ...UPCOMING_LAUNCHES[0], id: 'demo-orbital-dawn' },
    },
    {
      label: 'legacy ID',
      launch: { ...UPCOMING_LAUNCHES[0], id: 'past-demo-orbital-dawn' },
    },
    {
      label: 'source-mismatched ID',
      launch: { ...UPCOMING_LAUNCHES[0], source: 'spacex' },
    },
    {
      label: 'source-mismatched native ID',
      launch: { ...UPCOMING_LAUNCHES[0], sourceId: 'another-mission' },
    },
  ])('rejects a launch with $label', ({ launch }) => {
    expect(isLaunch(launch)).toBe(false);
  });

  it.each([
    {
      label: 'executable primary coverage',
      launch: {
        ...UPCOMING_LAUNCHES[0],
        livestream: 'javascript:alert(document.domain)',
      },
    },
    {
      label: 'credential-bearing primary coverage',
      launch: {
        ...UPCOMING_LAUNCHES[0],
        livestream: 'https://viewer:secret@example.test/coverage',
      },
    },
    {
      label: 'insecure ranked coverage',
      launch: {
        ...UPCOMING_LAUNCHES[0],
        livestream: null,
        livestreams: [
          {
            url: 'http://example.test/coverage',
            title: 'Unsafe provider coverage',
          },
        ],
      },
    },
  ])('rejects a launch with $label', ({ launch }) => {
    expect(isLaunch(launch)).toBe(false);
  });

  it('requires every collection to contain unique canonical launch IDs', () => {
    expect(isLaunchCollection(UPCOMING_LAUNCHES)).toBe(true);
    expect(
      isLaunchCollection([
        UPCOMING_LAUNCHES[0],
        { ...UPCOMING_LAUNCHES[0], name: 'Conflicting duplicate mission' },
      ])
    ).toBe(false);
  });

  it('requires complete, canonical provider metadata', () => {
    expect(isLaunchFeedMeta(FEED_META)).toBe(true);

    for (const invalidMeta of [
      { ...FEED_META, generatedAt: 'recently' },
      { ...FEED_META, partial: 'false' },
      { ...FEED_META, providers: { ll2: FEED_META.providers.ll2 } },
      {
        ...FEED_META,
        providers: {
          ...FEED_META.providers,
          spacex: { ...FEED_META.providers.spacex, state: 'recovering' },
        },
      },
      {
        ...FEED_META,
        providers: {
          ...FEED_META.providers,
          ll2: { ...FEED_META.providers.ll2, updatedAt: 'yesterday' },
        },
      },
    ]) {
      expect(isLaunchFeedMeta(invalidMeta)).toBe(false);
    }
  });

  it('accepts a complete launch-site atlas and rejects unsafe facility records', () => {
    const atlas = {
      sites: [
        {
          id: '80',
          name: 'Space Launch Complex 40',
          active: true,
          latitude: 28.5619,
          longitude: -80.5774,
          locationName: 'Cape Canaveral Space Force Station',
          countryCode: 'US',
          description: 'A workhorse orbital launch pad.',
          locationDescription: null,
          infoUrl: 'https://www.spacex.com/launches/',
          wikiUrl: null,
          totalLaunchCount: 230,
          orbitalLaunchAttemptCount: 229,
          agencies: ['SpaceX'],
          image: null,
        },
      ],
      meta: {
        generatedAt: '2035-07-28T12:00:00.000Z',
        cached: false,
        stale: false,
        source: 'launch-library-2',
        sourceUrl: 'https://thespacedevs.com/llapi',
      },
    };

    expect(isLaunchSiteAtlasResponse(atlas)).toBe(true);
    expect(
      isLaunchSiteAtlasResponse({
        ...atlas,
        sites: [{ ...atlas.sites[0], agencies: undefined }],
      }),
    ).toBe(false);
    expect(
      isLaunchSiteAtlasResponse({
        ...atlas,
        sites: [{ ...atlas.sites[0], latitude: 91 }],
      }),
    ).toBe(false);
    expect(
      isLaunchSiteAtlasResponse({
        ...atlas,
        sites: [
          {
            ...atlas.sites[0],
            infoUrl: 'javascript:alert(document.domain)',
          },
        ],
      }),
    ).toBe(false);
    expect(
      isLaunchSiteAtlasResponse({
        ...atlas,
        sites: [atlas.sites[0], atlas.sites[0]],
      }),
    ).toBe(false);
  });

  it('accepts mission intelligence with credential-free HTTPS destinations', () => {
    expect(isLaunchIntel(LAUNCH_INTEL)).toBe(true);
  });

  it.each([
    {
      label: 'executable recommended action',
      intel: {
        ...LAUNCH_INTEL,
        summary: {
          ...LAUNCH_INTEL.summary,
          recommendedUrl: 'javascript:alert(document.domain)',
        },
      },
    },
    {
      label: 'credential-bearing stream',
      intel: {
        ...LAUNCH_INTEL,
        streamCandidates: [
          {
            id: 'unsafe-stream',
            title: 'Unsafe stream',
            url: 'https://user:secret@example.test/coverage',
            channelTitle: 'Fixture channel',
            source: 'provided',
            confidence: 'high',
            liveStatus: 'live',
          },
        ],
      },
    },
    {
      label: 'insecure news item',
      intel: {
        ...LAUNCH_INTEL,
        newsItems: [
          {
            id: 'unsafe-news',
            title: 'Unsafe news',
            url: 'http://example.test/mission',
            source: 'Fixture news',
            publishedAt: '2035-07-26T12:00:00.000Z',
          },
        ],
      },
    },
    {
      label: 'executable social item',
      intel: {
        ...LAUNCH_INTEL,
        socialItems: [
          {
            id: 'unsafe-social',
            platform: 'x',
            title: 'Unsafe social signal',
            url: 'data:text/html,unsafe',
          },
        ],
      },
    },
    {
      label: 'insecure search fallback',
      intel: {
        ...LAUNCH_INTEL,
        quickLinks: {
          ...LAUNCH_INTEL.quickLinks,
          redditSearch: 'http://example.test/search',
        },
      },
    },
  ])('rejects mission intelligence with $label', ({ intel }) => {
    expect(isLaunchIntel(intel)).toBe(false);
  });
});
