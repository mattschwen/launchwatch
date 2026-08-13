import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TTLCache } from '@/lib/ttl-cache';

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not return expired stale data when a slow refresh fails', async () => {
    const cache = new TTLCache<string>({
      freshMs: 1_000,
      staleMs: 5_000,
    });
    const refreshFailure = new Error('Coverage provider unavailable');
    let rejectRefresh: ((reason?: unknown) => void) | undefined;
    const pendingRefresh = new Promise<string>((_resolve, reject) => {
      rejectRefresh = reject;
    });

    await expect(
      cache.getOrLoad('orbital-dawn', async () => 'verified coverage'),
    ).resolves.toBe('verified coverage');

    vi.advanceTimersByTime(1_500);
    await expect(
      cache.getOrLoad('orbital-dawn', () => pendingRefresh),
    ).resolves.toBe('verified coverage');

    vi.advanceTimersByTime(4_000);
    const waitingRequest = cache.getOrLoad(
      'orbital-dawn',
      async () => 'unexpected duplicate refresh',
    );
    rejectRefresh?.(refreshFailure);

    await expect(waitingRequest).rejects.toBe(refreshFailure);
    await expect(
      cache.getOrLoad('orbital-dawn', async () => 'recovered coverage'),
    ).resolves.toBe('recovered coverage');
  });
});
