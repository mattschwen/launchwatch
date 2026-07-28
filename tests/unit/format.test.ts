import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  firstLaunchValue,
  formatLaunchDate,
  formatLaunchValue,
  formatRelativeDate,
  isCompletedLaunch,
  isMeaningfulLaunchValue,
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

  it('uses concise relative labels around the current day', () => {
    expect(formatRelativeDate('2035-07-26T18:00:00.000Z')).toBe('Today');
    expect(formatRelativeDate('2035-07-27T18:00:00.000Z')).toBe('Tomorrow');
    expect(formatRelativeDate('2035-07-25T06:00:00.000Z')).toBe('Yesterday');
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
