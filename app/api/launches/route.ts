import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUpcomingLaunchesResult,
  getLiveLaunchesResult,
  getNextLaunchResult,
  getPastLaunchesResult,
  MAX_HISTORY_LIMIT,
} from '@/lib/api';
import type { LaunchFeedMeta } from '@/lib/types';

type LaunchRequestType = 'all' | 'live' | 'next' | 'history';

const CACHE_SECONDS: Record<LaunchRequestType, number> = {
  all: 300,
  live: 60,
  next: 120,
  history: 3600,
};

function isLaunchRequestType(value: string): value is LaunchRequestType {
  return value === 'all' || value === 'live' || value === 'next' || value === 'history';
}

function hasUsableProvider(meta: LaunchFeedMeta): boolean {
  return Object.values(meta.providers).some((provider) => (
    provider.state === 'ok' || provider.state === 'stale'
  ));
}

function legacySource(meta: LaunchFeedMeta): 'api' | 'server-cache' | 'stale-cache' {
  if (meta.stale) return 'stale-cache';
  if (meta.cached) return 'server-cache';
  return 'api';
}

function responseHeaders(type: LaunchRequestType): HeadersInit {
  return {
    'Cache-Control': `public, s-maxage=${CACHE_SECONDS[type]}, stale-while-revalidate=${CACHE_SECONDS[type] * 2}`,
  };
}

function parseHistoryLimit(searchParams: URLSearchParams): number | null {
  const rawLimit = searchParams.get('limit');
  if (rawLimit === null) {
    return 50;
  }

  if (!/^\d+$/.test(rawLimit)) {
    return null;
  }

  const limit = Number.parseInt(rawLimit, 10);
  return limit >= 1 && limit <= MAX_HISTORY_LIMIT ? limit : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const typeValue = searchParams.get('type') || 'all';

  if (!isLaunchRequestType(typeValue)) {
    return NextResponse.json(
      { error: 'Invalid type parameter. Use: all, live, next, or history' },
      { status: 400 },
    );
  }

  try {
    if (typeValue === 'history') {
      const limit = parseHistoryLimit(searchParams);
      if (limit === null) {
        return NextResponse.json(
          { error: `Invalid limit parameter. Use an integer from 1 to ${MAX_HISTORY_LIMIT}` },
          { status: 400 },
        );
      }

      const result = await getPastLaunchesResult(limit);
      if (!hasUsableProvider(result.meta)) {
        return NextResponse.json(
          {
            error: 'Launch history providers are unavailable',
            launches: [],
            cached: false,
            source: 'api',
            meta: result.meta,
          },
          { status: 502 },
        );
      }

      return NextResponse.json(
        {
          launches: result.data,
          cached: result.meta.cached,
          source: legacySource(result.meta),
          meta: result.meta,
        },
        { headers: responseHeaders(typeValue) },
      );
    }

    if (typeValue === 'next') {
      const result = await getNextLaunchResult();
      if (!hasUsableProvider(result.meta)) {
        return NextResponse.json(
          {
            error: 'Launch providers are unavailable',
            launch: null,
            cached: false,
            source: 'api',
            meta: result.meta,
          },
          { status: 502 },
        );
      }

      return NextResponse.json(
        {
          launch: result.data,
          cached: result.meta.cached,
          source: legacySource(result.meta),
          meta: result.meta,
        },
        { headers: responseHeaders(typeValue) },
      );
    }

    const result = typeValue === 'live'
      ? await getLiveLaunchesResult()
      : await getAllUpcomingLaunchesResult();
    if (!hasUsableProvider(result.meta)) {
      return NextResponse.json(
        {
          error: 'Launch providers are unavailable',
          launches: [],
          cached: false,
          source: 'api',
          meta: result.meta,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        launches: result.data,
        cached: result.meta.cached,
        source: legacySource(result.meta),
        meta: result.meta,
      },
      { headers: responseHeaders(typeValue) },
    );
  } catch (error) {
    console.error('Launch API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch launches' },
      { status: 500 },
    );
  }
}
