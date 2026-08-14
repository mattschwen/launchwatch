import { describe, expect, it } from 'vitest';
import { isNearTermLaunch } from '@/lib/schedule-horizon';
import type { Launch } from '@/lib/types';

const REFERENCE_TIME = Date.parse('2035-07-26T12:00:00.000Z');

function launchAt(
  date: string,
  datePrecision: Launch['datePrecision'] = null,
): Pick<Launch, 'date' | 'datePrecision' | 'isLive' | 'status'> {
  return {
    date,
    datePrecision,
    isLive: false,
    status: 'upcoming',
  };
}

describe('near-term schedule horizon', () => {
  it('includes today and the next seven days for day-or-better targets', () => {
    expect(
      isNearTermLaunch(
        launchAt('2035-07-26T00:00:00.000Z', {
          name: 'Day',
          abbrev: 'DAY',
        }),
        REFERENCE_TIME,
      ),
    ).toBe(true);
    expect(
      isNearTermLaunch(
        launchAt('2035-08-02T11:59:59.000Z', {
          name: 'Minute',
          abbrev: 'MIN',
        }),
        REFERENCE_TIME,
      ),
    ).toBe(true);
    expect(
      isNearTermLaunch(
        launchAt('2035-08-02T12:00:01.000Z', {
          name: 'Hour',
          abbrev: 'HR',
        }),
        REFERENCE_TIME,
      ),
    ).toBe(false);
  });

  it('excludes coarse placeholders but retains an active mission', () => {
    expect(
      isNearTermLaunch(
        launchAt('2035-07-31T00:00:00.000Z', {
          name: 'Month',
          abbrev: 'M',
        }),
        REFERENCE_TIME,
      ),
    ).toBe(false);

    expect(
      isNearTermLaunch(
        {
          ...launchAt('2035-07-20T00:00:00.000Z', {
            name: 'Month',
            abbrev: 'M',
          }),
          isLive: true,
          status: 'live',
        },
        REFERENCE_TIME,
      ),
    ).toBe(true);
  });

  it('fails closed for invalid dates and references', () => {
    expect(isNearTermLaunch(launchAt('not-a-date'), REFERENCE_TIME)).toBe(false);
    expect(
      isNearTermLaunch(launchAt('2035-07-27T00:00:00.000Z'), Number.NaN),
    ).toBe(false);
  });
});
