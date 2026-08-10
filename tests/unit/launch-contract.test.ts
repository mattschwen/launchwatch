import { describe, expect, it } from 'vitest';
import { isLaunch, isLaunchCollection } from '@/lib/launch-contract';
import { UPCOMING_LAUNCHES } from '@/tests/fixtures/launches';

describe('client launch contract', () => {
  it('accepts a normalized launch with canonical provider identity', () => {
    expect(isLaunch(UPCOMING_LAUNCHES[0])).toBe(true);
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

  it('requires every collection to contain unique canonical launch IDs', () => {
    expect(isLaunchCollection(UPCOMING_LAUNCHES)).toBe(true);
    expect(
      isLaunchCollection([
        UPCOMING_LAUNCHES[0],
        { ...UPCOMING_LAUNCHES[0], name: 'Conflicting duplicate mission' },
      ])
    ).toBe(false);
  });
});
