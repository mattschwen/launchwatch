import { describe, expect, it } from 'vitest';
import { isLaunch } from '@/lib/launch-contract';
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
});
