import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  firstLaunchValue,
  formatLaunchDate,
  formatLaunchPrecisionLabel,
  formatLaunchTarget,
  formatLaunchTime,
  formatLaunchWindow,
  formatTimelineOffset,
  formatLaunchValue,
  formatRelativeDate,
  isCompletedLaunch,
  isMeaningfulLaunchValue,
  hasCalendarReadyLaunchTime,
  hasExactLaunchTime,
  launchOutcomeLabel,
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

  it('formats provider timeline durations as scannable mission offsets', () => {
    expect(formatTimelineOffset('-P0DT2H35M')).toBe('T−02:35:00');
    expect(formatTimelineOffset('P0DT0H54M12S')).toBe('T+00:54:12');
    expect(formatTimelineOffset('P0D')).toBe('T+00:00:00');
    expect(formatTimelineOffset('-P1DT2H3M4.5S')).toBe('T−1d 02:03:04.5');
    expect(formatTimelineOffset('T−00:35:00')).toBe('T−00:35:00');
    expect(formatTimelineOffset(' pending ')).toBe('pending');
  });

  it('shortens long launch-site names without losing identity', () => {
    expect(
      shortenLaunchSite(
        'Space Launch Complex 40, Cape Canaveral Space Force Station, USA'
      )
    ).toBe('SLC-40, Cape Canaveral');
    expect(shortenLaunchSite('LC 9A, Taiyuan')).toBe('LC-9A, Taiyuan');
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

  it('labels completed and scheduled missions consistently', () => {
    expect(isCompletedLaunch(HISTORICAL_LAUNCHES[0])).toBe(true);
    expect(launchOutcomeLabel(HISTORICAL_LAUNCHES[0])).toBe('Success');
    expect(isCompletedLaunch(UPCOMING_LAUNCHES[0])).toBe(false);
    expect(launchOutcomeLabel(UPCOMING_LAUNCHES[0])).toBe('Go');
  });
});
