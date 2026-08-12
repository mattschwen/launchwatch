import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  firstLaunchValue,
  formatLaunchDate,
  formatLocalLaunchTime,
  formatLaunchPrecisionLabel,
  getLaunchSiteDisplay,
  getPendingLaunchStatus,
  formatPrimaryMissionName,
  formatLaunchTarget,
  formatLaunchTime,
  formatLaunchWindow,
  formatLaunchWindowTimes,
  formatLocalLaunchWindow,
  formatTimelineOffset,
  formatTimelineEventUtcTime,
  getTimelineEventDate,
  getTimelineProgress,
  formatLaunchValue,
  formatRelativeDate,
  isCompletedLaunch,
  getLaunchLiveSignal,
  isMeaningfulLaunchValue,
  normalizeLaunchDescription,
  hasCalendarReadyLaunchTime,
  hasExactLaunchTime,
  launchOutcomeLabel,
  matchesLaunchSearch,
  shortenLaunchSite,
} from '@/lib/format';
import { HISTORICAL_LAUNCHES, UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('launch formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats dates in UTC and handles invalid input', () => {
    expect(formatLaunchDate('2035-07-28T14:30:00.000Z')).toContain('UTC');
    expect(formatLaunchDate('not-a-date')).toBe('Date unavailable');
  });

  it('adds local context only for precise targets outside UTC', () => {
    expect(
      formatLocalLaunchTime(
        '2035-07-28T14:30:00.000Z',
        null,
        'America/Denver'
      )
    ).toBe('8:30 AM MDT');
    expect(
      formatLocalLaunchTime('2035-07-28T14:30:00.000Z', null, 'UTC')
    ).toBeNull();
    expect(
      formatLocalLaunchTime(
        '2035-07-28T14:30:00.000Z',
        { name: 'Day', abbrev: 'DAY' },
        'America/Denver'
      )
    ).toBeNull();
    expect(
      formatLocalLaunchTime('not-a-date', null, 'America/Denver')
    ).toBeNull();
    expect(
      formatLocalLaunchTime(
        '2035-07-28T14:30:00.000Z',
        null,
        'Not/A_Timezone'
      )
    ).toBeNull();
    expect(
      formatLocalLaunchTime(
        '2035-07-28T01:30:00.000Z',
        null,
        'America/Denver'
      )
    ).toBe('Jul 27, 7:30 PM MDT');
  });

  it('formats provider precision without inventing exact placeholder times', () => {
    const month = { name: 'Month', abbrev: 'M' };
    const quarter = { name: 'Quarter 3', abbrev: 'Q3' };
    const hour = { name: 'Hour', abbrev: 'HR' };

    expect(formatLaunchTarget('2035-08-31T00:00:00.000Z', month)).toBe(
      'August 2035'
    );
    expect(formatLaunchTarget('2035-09-30T00:00:00.000Z', quarter)).toBe(
      'Q3 2035'
    );
    expect(formatLaunchTime('2035-08-17T02:00:00.000Z', hour)).toBe(
      '02:00 UTC · Hour estimate'
    );
    expect(formatLaunchPrecisionLabel(month)).toBe('Month estimate');
    expect(hasExactLaunchTime(month)).toBe(false);
    expect(hasCalendarReadyLaunchTime(month)).toBe(false);
    expect(hasCalendarReadyLaunchTime({ name: 'Minute', abbrev: 'MIN' })).toBe(
      true
    );
  });

  it('preserves the provider distinction between TBC and TBD timing', () => {
    expect(getPendingLaunchStatus('To Be Confirmed')).toEqual({
      label: 'TBC',
      name: 'To be confirmed',
    });
    expect(getPendingLaunchStatus('TBC')).toEqual({
      label: 'TBC',
      name: 'To be confirmed',
    });
    expect(getPendingLaunchStatus('To Be Determined')).toEqual({
      label: 'TBD',
      name: 'To be determined',
    });
    expect(getPendingLaunchStatus(null)).toEqual({
      label: 'TBD',
      name: 'To be determined',
    });
  });

  it('uses concise relative labels around the current day', () => {
    expect(formatRelativeDate('2035-07-26T18:00:00.000Z')).toBe('Today');
    expect(formatRelativeDate('2035-07-27T18:00:00.000Z')).toBe('Tomorrow');
    expect(formatRelativeDate('2035-07-25T06:00:00.000Z')).toBe('Yesterday');
  });

  it('formats only validated provider launch windows', () => {
    expect(formatLaunchWindow(UPCOMING_LAUNCHES[0])).toBe(
      'Jul 28, 2035, 14:30–16:30 UTC'
    );
    expect(
      formatLaunchWindow({
        ...UPCOMING_LAUNCHES[0],
        windowStart: '2035-07-28T23:30:00.000Z',
        date: '2035-07-29T00:00:00.000Z',
        windowEnd: '2035-07-29T00:30:00.000Z',
      })
    ).toBe('Jul 28, 2035, 23:30 UTC – Jul 29, 2035, 00:30 UTC');
    expect(
      formatLaunchWindow({
        ...UPCOMING_LAUNCHES[0],
        windowStart: '2035-07-28T16:30:00.000Z',
        windowEnd: '2035-07-28T14:30:00.000Z',
      })
    ).toBeNull();
    expect(
      formatLaunchWindow({
        ...UPCOMING_LAUNCHES[0],
        windowStart: '2035-07-28T15:30:00.000Z',
        windowEnd: '2035-07-28T16:30:00.000Z',
      })
    ).toBeNull();
  });

  it('keeps same-day launch windows compact for mission summaries', () => {
    expect(formatLaunchWindowTimes(UPCOMING_LAUNCHES[0])).toBe(
      '14:30–16:30 UTC'
    );
    expect(
      formatLaunchWindowTimes({
        ...UPCOMING_LAUNCHES[0],
        windowStart: '2035-07-28T23:30:00.000Z',
        date: '2035-07-29T00:00:00.000Z',
        windowEnd: '2035-07-29T00:30:00.000Z',
      })
    ).toBe('Jul 28, 2035, 23:30 UTC – Jul 29, 2035, 00:30 UTC');
  });

  it('translates validated provider windows without repeating UTC', () => {
    expect(
      formatLocalLaunchWindow(UPCOMING_LAUNCHES[0], 'America/Denver')
    ).toBe('8:30 AM–10:30 AM MDT');
    expect(
      formatLocalLaunchWindow(UPCOMING_LAUNCHES[0], 'UTC')
    ).toBeNull();
    expect(
      formatLocalLaunchWindow(
        {
          date: '2035-07-28T01:30:00.000Z',
          windowStart: '2035-07-28T01:30:00.000Z',
          windowEnd: '2035-07-28T07:30:00.000Z',
        },
        'America/Denver'
      )
    ).toBe('Jul 27, 7:30 PM–Jul 28, 1:30 AM MDT');
    expect(
      formatLocalLaunchWindow(UPCOMING_LAUNCHES[0], 'Not/A_Timezone')
    ).toBeNull();
  });

  it('formats provider timeline durations as scannable mission offsets', () => {
    expect(formatTimelineOffset('-P0DT2H35M')).toBe('T−02:35:00');
    expect(formatTimelineOffset('P0DT0H54M12S')).toBe('T+00:54:12');
    expect(formatTimelineOffset('P0D')).toBe('T+00:00:00');
    expect(formatTimelineOffset('-P1DT2H3M4.5S')).toBe('T−1d 02:03:04.5');
    expect(formatTimelineOffset('T−00:35:00')).toBe('T−00:35:00');
    expect(formatTimelineOffset(' pending ')).toBe('pending');
  });

  it('derives precise mission-clock times from provider timeline offsets', () => {
    expect(
      formatTimelineEventUtcTime(
        '2035-07-28T14:30:00.000Z',
        '-P0DT2H35M'
      )
    ).toBe('11:55 UTC');
    expect(
      formatTimelineEventUtcTime(
        '2035-07-28T00:30:00.000Z',
        'T−02:35:00'
      )
    ).toBe('Jul 27 · 21:55 UTC');
    expect(
      getTimelineEventDate(
        '2035-07-28T14:30:00.000Z',
        'P0DT0H54M12.5S'
      )?.toISOString()
    ).toBe('2035-07-28T15:24:12.500Z');
  });

  it('identifies the next provider timeline milestone after elapsed events', () => {
    expect(
      getTimelineProgress(
        '2035-07-26T12:30:00.000Z',
        [
          { type: 'Propellant load', relativeTime: '-PT35M', description: '' },
          { type: 'Startup', relativeTime: '-PT1M', description: '' },
          { type: 'Liftoff', relativeTime: 'P0D', description: '' },
        ],
        null,
        Date.parse('2035-07-26T12:00:00.000Z')
      )
    ).toEqual({ completedCount: 1, nextIndex: 1, validCount: 3 });
  });

  it('withholds timeline progress when provider timing is coarse or unusable', () => {
    const timeline = [
      { type: 'Liftoff', relativeTime: 'P0D', description: '' },
    ];

    expect(
      getTimelineProgress(
        '2035-07-26T12:30:00.000Z',
        timeline,
        { name: 'Day', abbrev: 'DAY' },
        Date.parse('2035-07-26T12:00:00.000Z')
      )
    ).toBeNull();
    expect(
      getTimelineProgress(
        'not-a-date',
        timeline,
        null,
        Date.parse('2035-07-26T12:00:00.000Z')
      )
    ).toBeNull();
  });

  it('reports an elapsed provider sequence without calling the mission complete', () => {
    expect(
      getTimelineProgress(
        '2035-07-26T11:00:00.000Z',
        [
          { type: 'Liftoff', relativeTime: 'P0D', description: '' },
          { type: 'Deployment', relativeTime: 'PT10M', description: '' },
        ],
        null,
        Date.parse('2035-07-26T12:00:00.000Z')
      )
    ).toEqual({ completedCount: 2, nextIndex: null, validCount: 2 });
  });

  it('withholds mission-clock times for coarse or malformed provider timing', () => {
    expect(
      formatTimelineEventUtcTime(
        '2035-07-28T14:30:00.000Z',
        '-P0DT2H35M',
        { name: 'Hour', abbrev: 'HR' }
      )
    ).toBeNull();
    expect(
      formatTimelineEventUtcTime(
        '2035-07-28T14:30:00.000Z',
        'provider pending'
      )
    ).toBeNull();
  });

  it('shortens long launch-site names without losing identity', () => {
    expect(
      shortenLaunchSite(
        'Space Launch Complex 40, Cape Canaveral Space Force Station, USA'
      )
    ).toBe('SLC-40, Cape Canaveral');
    expect(shortenLaunchSite('LC 9A, Taiyuan')).toBe('LC-9A, Taiyuan');
  });

  it('pairs ambiguous pad identifiers with provider location context', () => {
    expect(
      getLaunchSiteDisplay({
        launchSite: '201',
        location: {
          lat: 19.618452,
          lng: 110.955356,
          name: "Wenchang Space Launch Site, People's Republic of China",
          countryCode: 'CN',
        },
      })
    ).toEqual({
      primary: '201',
      context: 'Wenchang Space Launch Site, China',
      label: '201 · Wenchang Space Launch Site, China',
    });

    expect(
      getLaunchSiteDisplay({
        launchSite:
          'Space Launch Complex 40, Cape Canaveral Space Force Station, USA',
        location: {
          lat: 28.5619,
          lng: -80.5774,
          name: 'Cape Canaveral Space Force Station, USA',
          countryCode: 'US',
        },
      })
    ).toEqual({
      primary: 'SLC-40',
      context: 'Cape Canaveral',
      label: 'SLC-40 · Cape Canaveral',
    });
  });

  it('replaces provider placeholder metadata with useful fallback copy', () => {
    expect(isMeaningfulLaunchValue('Low Earth Orbit')).toBe(true);
    expect(isMeaningfulLaunchValue('Unknown')).toBe(false);
    expect(isMeaningfulLaunchValue('To Be Determined')).toBe(false);
    expect(formatLaunchValue(' Unknown ', 'Target pending')).toBe(
      'Target pending'
    );
    expect(
      firstLaunchValue(['Unknown', null, '  Communications  '], 'Pending')
    ).toBe('Communications');
  });

  it('uses a structured mission name only when it safely removes a provider vehicle prefix', () => {
    expect(
      formatPrimaryMissionName({
        name: 'Falcon Heavy | Nancy Grace Roman Space Telescope',
        missionName: 'Nancy Grace Roman Space Telescope',
      })
    ).toBe('Nancy Grace Roman Space Telescope');
    expect(
      formatPrimaryMissionName({
        name: 'Long March 7A | Unknown Payload',
        missionName: 'Unknown Payload',
      })
    ).toBe('Long March 7A | Unknown Payload');
    expect(
      formatPrimaryMissionName({
        name: 'Provider designation',
        missionName: 'Different mission',
      })
    ).toBe('Provider designation');
  });

  it('separates a live prelaunch broadcast from an in-flight mission', () => {
    const coverageLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'Go for Launch',
      isLive: true,
      webcastLive: true,
    };

    expect(getLaunchLiveSignal(coverageLaunch)).toBe('coverage');
    expect(
      getLaunchLiveSignal({
        ...coverageLaunch,
        statusName: 'In Flight',
      })
    ).toBe('mission');
    expect(getLaunchLiveSignal(UPCOMING_LAUNCHES[0])).toBe('inactive');
  });

  it('normalizes provider description placeholders without hiding real copy', () => {
    expect(normalizeLaunchDescription(' Details TBD. ')).toBeNull();
    expect(normalizeLaunchDescription('Description pending')).toBeNull();
    expect(
      normalizeLaunchDescription('Mission details to be determined.')
    ).toBeNull();
    expect(normalizeLaunchDescription('TBD.')).toBeNull();
    expect(
      normalizeLaunchDescription('Details pending final mission review.')
    ).toBe('Details pending final mission review.');
  });

  it('matches every search term across a launch mission profile', () => {
    const launch = UPCOMING_LAUNCHES[0];

    expect(matchesLaunchSearch(launch, 'communications')).toBe(true);
    expect(matchesLaunchSearch(launch, 'low earth orbit')).toBe(true);
    expect(matchesLaunchSearch(launch, 'orbital alliance nova')).toBe(true);
    expect(matchesLaunchSearch(launch, 'relay authority government')).toBe(true);
    expect(matchesLaunchSearch(launch, 'ora')).toBe(true);
    expect(matchesLaunchSearch(launch, '  ')).toBe(true);
    expect(matchesLaunchSearch(launch, 'communications falcon')).toBe(false);
    expect(
      matchesLaunchSearch(HISTORICAL_LAUNCHES[1], 'qualification ascent'),
    ).toBe(true);
  });

  it('matches provider punctuation, accents, and letter-number joins forgivingly', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      name: "H3-22 | Chang'e 7",
      missionName: "Chang'e 7",
      provider: 'Agence Spatiale Démo',
      rocket: 'H3-22',
    };

    expect(matchesLaunchSearch(launch, 'change 7')).toBe(true);
    expect(matchesLaunchSearch(launch, 'h322')).toBe(true);
    expect(matchesLaunchSearch(launch, 'agence demo')).toBe(true);
    expect(matchesLaunchSearch(launch, 'h3–22 chang’e')).toBe(true);
    expect(matchesLaunchSearch(launch, '---')).toBe(false);
  });

  it('labels terminal and unconfirmed outcomes consistently', () => {
    expect(isCompletedLaunch(HISTORICAL_LAUNCHES[0])).toBe(true);
    expect(launchOutcomeLabel(HISTORICAL_LAUNCHES[0])).toBe('Success');
    expect(isCompletedLaunch(UPCOMING_LAUNCHES[0])).toBe(false);
    expect(launchOutcomeLabel(UPCOMING_LAUNCHES[0])).toBe(
      'Outcome unconfirmed'
    );
  });
});
