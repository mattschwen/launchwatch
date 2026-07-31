import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUpcomingLaunchesResult,
  getLiveLaunchesResult,
  getNextLaunchResult,
  getPastLaunchesResult,
  MAX_HISTORY_LIMIT,
} from '@/lib/api';
import {
  parseLaunchFeedQuery,
  type LaunchFeedRequestType,
} from '@/lib/launch-feed-params';
import type { LaunchFeedMeta } from '@/lib/types';

const CACHE_SECONDS: Record<LaunchFeedRequestType, number> = {
  all: 300,
  live: 60,
  next: 120,
  history: 3600,
};

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

function responseHeaders(type: LaunchFeedRequestType): HeadersInit {
  return {
    'Cache-Control': `public, s-maxage=${CACHE_SECONDS[type]}, stale-while-revalidate=${CACHE_SECONDS[type] * 2}`,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = parseLaunchFeedQuery(searchParams, MAX_HISTORY_LIMIT);

  if (query.type === null) {
    return NextResponse.json(
      { error: query.error },
      { status: 400 },
    );
  }
  const typeValue = query.type;

  try {
    if (typeValue === 'history') {
      const result = await getPastLaunchesResult(query.historyLimit);
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
