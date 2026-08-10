import { describe, expect, it } from 'vitest';
import {
  getLaunchIdFromIntelParams,
  serializeLaunchForIntel,
} from '@/lib/launch-intel-params';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('launch intelligence query parameters', () => {
  it('serializes and reads one exact canonical launch ID', () => {
    const launch = UPCOMING_LAUNCHES[0];
    const query = serializeLaunchForIntel(launch);

    expect(query).toBe(`id=${encodeURIComponent(launch.id)}`);
    expect(getLaunchIdFromIntelParams(new URLSearchParams(query))).toBe(
      launch.id,
    );
  });

  it.each([
    '',
    ' id=ll2-demo-orbital-dawn',
    'id=%20ll2-demo-orbital-dawn%20',
    'id=past-demo-return',
    `id=ll2-${'x'.repeat(129)}`,
  ])('rejects non-canonical input %j', (query) => {
    expect(getLaunchIdFromIntelParams(new URLSearchParams(query))).toBeNull();
  });
});
