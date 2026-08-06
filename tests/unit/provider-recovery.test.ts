import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpaceXLaunch } from '@/lib/types';

const UPCOMING_SPACEX_LAUNCH: SpaceXLaunch = {
  id: 'recovered-flight',
  name: 'Recovered Flight',
  date_utc: '2035-07-28T14:30:00.000Z',
  date_unix: 2069245800,
  rocket: 'falcon-9',
  success: null,
  details: null,
  links: {
    webcast: null,
    youtube_id: null,
    article: null,
    wikipedia: null,
  },
  launchpad: '39a',
  upcoming: true,
};

describe('provider recovery window', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-26T12:00:00.000Z'));
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not immediately repeat a failed SpaceX resource request', async () => {
    const providerFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 525 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ docs: [UPCOMING_SPACEX_LAUNCH] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', providerFetch);
    const { getSpaceXUpcomingLaunches } = await import('@/lib/api');

    await expect(getSpaceXUpcomingLaunches()).resolves.toEqual([]);
    await expect(getSpaceXUpcomingLaunches()).resolves.toEqual([]);
    expect(providerFetch).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(30_001);

    await expect(getSpaceXUpcomingLaunches()).resolves.toEqual([
      UPCOMING_SPACEX_LAUNCH,
    ]);
    expect(providerFetch).toHaveBeenCalledTimes(2);
  });
});
