import { describe, expect, it } from 'vitest';
import { getFeedHealth } from '@/lib/feed-health';

const nominal = {
  hasLaunches: true,
  loading: false,
  refreshing: false,
  error: null,
  partial: false,
  stale: false,
};

describe('getFeedHealth', () => {
  it('distinguishes initial synchronization and a terminal outage', () => {
    expect(
      getFeedHealth({
        ...nominal,
        hasLaunches: false,
        loading: true,
      })
    ).toBe('syncing');
    expect(
      getFeedHealth({
        ...nominal,
        hasLaunches: false,
        error: 'Providers unavailable',
      })
    ).toBe('offline');
  });

  it('prioritizes active refresh and stale data over partial metadata', () => {
    expect(
      getFeedHealth({
        ...nominal,
        refreshing: true,
        partial: true,
        stale: true,
      })
    ).toBe('refreshing');
    expect(
      getFeedHealth({
        ...nominal,
        partial: true,
        stale: true,
      })
    ).toBe('stale');
  });

  it('treats provider errors with retained launches as partial service', () => {
    expect(
      getFeedHealth({
        ...nominal,
        error: 'One provider failed',
      })
    ).toBe('partial');
    expect(getFeedHealth({ ...nominal, partial: true })).toBe('partial');
    expect(getFeedHealth(nominal)).toBe('nominal');
  });
});
