import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LaunchFeedMeta, LaunchSiteAtlasResponse } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

const apiMocks = vi.hoisted(() => ({
  getLaunchByIdResult: vi.fn(),
}));
const siteMocks = vi.hoisted(() => ({
  getNearbyLaunchSites: vi.fn(),
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

vi.mock('@/lib/launch-sites', () => siteMocks);

vi.mock('@/lib/rate-limit', () => ({
  checkRequestRateLimit: () => ({
    allowed: true,
    limit: 240,
    remaining: 239,
    resetAt: Date.now() + 60_000,
    retryAfterSeconds: 60,
  }),
  rateLimitHeaders: () => ({}),
}));

import { GET } from '@/app/api/launch-sites/route';

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

const FRESH_ATLAS: LaunchSiteAtlasResponse = {
  sites: [],
  meta: {
    generatedAt: '2035-07-26T12:00:00.000Z',
    cached: false,
    stale: false,
    source: 'launch-library-2',
    sourceUrl: 'https://thespacedevs.com/llapi',
  },
};

function request(): NextRequest {
  return new NextRequest(
    'https://launchwatch.test/api/launch-sites?id=ll2-demo-orbital-dawn',
  );
}

describe('launch-site response caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getLaunchByIdResult.mockResolvedValue({
      data: UPCOMING_LAUNCHES[0],
      notFound: false,
      meta: FRESH_META,
    });
    siteMocks.getNearbyLaunchSites.mockResolvedValue(FRESH_ATLAS);
  });

  it('keeps the normal shared-cache window for fresh facility data', async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=21600, stale-while-revalidate=86400',
    );
    expect(response.headers.get('X-LaunchWatch-Data-State')).toBe('fresh');
  });

  it('does not shared-cache a stale facility atlas', async () => {
    siteMocks.getNearbyLaunchSites.mockResolvedValue({
      ...FRESH_ATLAS,
      meta: {
        ...FRESH_ATLAS.meta,
        cached: true,
        stale: true,
      },
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('X-LaunchWatch-Data-State')).toBe('stale');
  });

  it.each([
    { partial: true, stale: false, state: 'partial' },
    { partial: false, stale: true, state: 'stale' },
  ])(
    'does not shared-cache facilities resolved from a $state launch record',
    async ({ partial, stale }) => {
      apiMocks.getLaunchByIdResult.mockResolvedValue({
        data: UPCOMING_LAUNCHES[0],
        notFound: false,
        meta: {
          ...FRESH_META,
          partial,
          stale,
          cached: stale,
        },
      });

      const response = await GET(request());

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    },
  );
});
