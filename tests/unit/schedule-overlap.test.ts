import { describe, expect, it } from 'vitest';
import { getLaunchWindowOverlaps } from '@/lib/schedule-overlap';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('getLaunchWindowOverlaps', () => {
  it('returns exact intersections in chronological order', () => {
    const first = {
      ...UPCOMING_LAUNCHES[0],
      windowStart: '2035-07-28T14:30:00.000Z',
      windowEnd: '2035-07-28T16:30:00.000Z',
    };
    const second = {
      ...UPCOMING_LAUNCHES[1],
      date: '2035-07-28T16:00:00.000Z',
      dateUnix: 2069251200,
      windowStart: '2035-07-28T16:00:00.000Z',
      windowEnd: '2035-07-28T16:15:00.000Z',
    };

    expect(getLaunchWindowOverlaps([second, first])).toEqual([
      {
        firstLaunch: first,
        secondLaunch: second,
        start: '2035-07-28T16:00:00.000Z',
        end: '2035-07-28T16:15:00.000Z',
        durationMs: 15 * 60_000,
      },
    ]);
  });

  it('rejects touching, coarse, malformed, and excessively broad windows', () => {
    const base = UPCOMING_LAUNCHES[0];
    const touching = {
      ...UPCOMING_LAUNCHES[1],
      date: base.windowEnd!,
      dateUnix: Date.parse(base.windowEnd!) / 1_000,
      windowStart: base.windowEnd,
      windowEnd: '2035-07-28T17:00:00.000Z',
    };
    const coarse = {
      ...base,
      id: 'll2-coarse-window',
      sourceId: 'coarse-window',
      datePrecision: { name: 'Day', abbrev: 'DAY' },
    };
    const malformed = {
      ...base,
      id: 'll2-malformed-window',
      sourceId: 'malformed-window',
      windowEnd: base.windowStart,
    };
    const broad = {
      ...base,
      id: 'll2-broad-window',
      sourceId: 'broad-window',
      date: '2035-07-29T14:30:00.000Z',
      dateUnix: 2069332200,
      windowEnd: '2035-07-30T14:30:00.001Z',
    };

    expect(
      getLaunchWindowOverlaps([base, touching, coarse, malformed, broad]),
    ).toEqual([]);
  });
});
