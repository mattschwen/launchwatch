import { describe, expect, it } from 'vitest';
import { getScheduleResults } from '@/lib/schedule-results';
import { DEFAULT_SCHEDULE_FILTERS } from '@/lib/schedule-return';
import { UPCOMING_LAUNCHES } from '@/tests/fixtures/launches';

const REFERENCE_TIME = new Date('2035-07-27T00:00:00.000Z').getTime();

describe('schedule results', () => {
  it('applies the shared schedule filters before sorting', () => {
    const results = getScheduleResults(
      UPCOMING_LAUNCHES,
      {
        ...DEFAULT_SCHEDULE_FILTERS,
        provider: 'SpaceX',
        search: 'technology',
      },
      REFERENCE_TIME,
    );

    expect(results.map((launch) => launch.id)).toEqual([
      'spacex-demo-polaris',
    ]);
  });

  it('keeps detail navigation order aligned with the selected schedule sort', () => {
    const results = getScheduleResults(
      UPCOMING_LAUNCHES,
      { ...DEFAULT_SCHEDULE_FILTERS, sortBy: 'date-desc' },
      REFERENCE_TIME,
    );

    expect(results.map((launch) => launch.id)).toEqual([
      'spacex-demo-polaris',
      'll2-demo-orbital-dawn',
    ]);
  });
});
