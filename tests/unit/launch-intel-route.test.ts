import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LaunchFeedMeta } from '@/lib/types';
import { LAUNCH_INTEL, UPCOMING_LAUNCHES } from '../fixtures/launches';

const apiMocks = vi.hoisted(() => ({
  getLaunchByIdResult: vi.fn(),
}));
const intelMocks = vi.hoisted(() => ({
  getLaunchIntel: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  ...apiMocks,
  parseLaunchId: (id: string) => ({
    canonicalId: id,
    legacy: false,
    source: 'll2' as const,
    sourceId: id.replace(/^ll2-/, ''),
  }),
}));

vi.mock('@/lib/launch-intel', () => intelMocks);

vi.mock('@/lib/rate-limit', () => ({
  checkRequestRateLimit: () => ({
    allowed: true,
    limit: 8,
    remaining: 7,
    resetAt: Date.now() + 60_000,
    retryAfterSeconds: 60,
  }),
  rateLimitHeaders: () => ({}),
}));

import { GET } from '@/app/api/launch-intel/route';

const FRESH_META: LaunchFeedMeta = {
  generatedAt: '2035-07-26T12:00:00.000Z',
  partial: false,
  stale: false,
  cached: false,
  providers: {
    spacex: {
      state: 'not-requested',
      cached: false,
      updatedAt: null,
    },
    ll2: {
      state: 'ok',
      cached: false,
      updatedAt: '2035-07-26T12:00:00.000Z',
    },
  },
};

function request(): NextRequest {
  return new NextRequest(
    'https://launchwatch.test/api/launch-intel?id=ll2-demo-orbital-dawn',
  );
}

describe('launch intelligence response caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intelMocks.getLaunchIntel.mockResolvedValue(LAUNCH_INTEL);
  });

  it('keeps the normal shared-cache window for fresh mission intelligence', async () => {
    apiMocks.getLaunchByIdResult.mockResolvedValue({
      data: UPCOMING_LAUNCHES[0],
      notFound: false,
      meta: FRESH_META,
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=120, stale-while-revalidate=600',
    );
  });

  it.each([
    { partial: true, stale: false, state: 'partial' },
    { partial: false, stale: true, state: 'stale' },
  ])(
    'does not shared-cache $state mission intelligence',
    async ({ partial, stale }) => {
      apiMocks.getLaunchByIdResult.mockResolvedValue({
        data: UPCOMING_LAUNCHES[0],
        notFound: false,
        meta: {
          ...FRESH_META,
          partial,
          stale,
          cached: stale,
          providers: {
            ...FRESH_META.providers,
            ll2: {
              state: stale ? 'stale' : 'ok',
              cached: stale,
              updatedAt: '2035-07-26T11:30:00.000Z',
              ...(stale ? { error: 'Provider unavailable' } : {}),
            },
          },
        },
      });

      const response = await GET(request());

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(response.headers.get('X-LaunchWatch-Data-State')).toBe(
        stale ? 'stale' : 'fresh',
      );
    },
  );
});
