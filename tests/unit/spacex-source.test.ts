import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('retired direct SpaceX source', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('SPACEX_API_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the healthy LL2 schedule without requesting the retired default API', async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', providerFetch);
    const { getAllUpcomingLaunchesResult } = await import('@/lib/api');

    const result = await getAllUpcomingLaunchesResult();

    expect(providerFetch).toHaveBeenCalledOnce();
    expect(String(providerFetch.mock.calls[0][0])).toContain(
      'll.thespacedevs.com',
    );
    expect(result.meta.partial).toBe(false);
    expect(result.meta.providers.spacex.state).toBe('not-requested');
    expect(result.meta.providers.ll2.state).toBe('ok');
  });

  it('uses LL2 history without requesting the retired default API', async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', providerFetch);
    const { getPastLaunchesResult } = await import('@/lib/api');

    const result = await getPastLaunchesResult();

    expect(providerFetch).toHaveBeenCalledOnce();
    expect(String(providerFetch.mock.calls[0][0])).toContain(
      'll.thespacedevs.com',
    );
    expect(result.meta.partial).toBe(false);
    expect(result.meta.providers.spacex.state).toBe('not-requested');
    expect(result.meta.providers.ll2.state).toBe('ok');
  });
});
