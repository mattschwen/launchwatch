import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LaunchFeedMeta } from '@/lib/types';

const apiMocks = vi.hoisted(() => ({
  getAllUpcomingLaunchesResult: vi.fn(),
  getLiveLaunchesResult: vi.fn(),
  getNextLaunchResult: vi.fn(),
  getPastLaunchesResult: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  MAX_HISTORY_LIMIT: 100,
  ...apiMocks,
}));

import { GET } from '@/app/api/launches/route';

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

function request(type: 'all' | 'live' | 'next' | 'history' = 'all'): NextRequest {
  return new NextRequest(`https://launchwatch.test/api/launches?type=${type}`);
}

describe('launch feed response caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the normal shared-cache window for a fresh provider response', async () => {
    apiMocks.getAllUpcomingLaunchesResult.mockResolvedValue({
      data: [],
      meta: FRESH_META,
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=600',
    );
  });

  it.each([
    {
      type: 'all' as const,
      mock: apiMocks.getAllUpcomingLaunchesResult,
      data: [],
      state: 'partial',
      meta: {
        ...FRESH_META,
        partial: true,
        providers: {
          ...FRESH_META.providers,
          spacex: {
            state: 'error' as const,
            cached: false,
            updatedAt: null,
            error: 'Provider unavailable',
          },
        },
      },
    },
    {
      type: 'live' as const,
      mock: apiMocks.getLiveLaunchesResult,
      data: [],
      state: 'stale',
      meta: {
        ...FRESH_META,
        partial: true,
        stale: true,
        cached: true,
        providers: {
          ...FRESH_META.providers,
          ll2: {
            state: 'stale' as const,
            cached: true,
            updatedAt: '2035-07-26T11:30:00.000Z',
            error: 'Provider unavailable',
          },
        },
      },
    },
    {
      type: 'next' as const,
      mock: apiMocks.getNextLaunchResult,
      data: null,
      state: 'partial',
      meta: {
        ...FRESH_META,
        partial: true,
      },
    },
    {
      type: 'history' as const,
      mock: apiMocks.getPastLaunchesResult,
      data: [],
      state: 'stale',
      meta: {
        ...FRESH_META,
        partial: true,
        stale: true,
        cached: true,
      },
    },
  ])(
    'does not shared-cache a $state $type response',
    async ({ type, mock, data, meta }) => {
      mock.mockResolvedValue({
        data,
        meta,
      });

      const response = await GET(request(type));

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    },
  );
});
