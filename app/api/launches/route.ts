import { NextRequest, NextResponse } from 'next/server';
import { getAllUpcomingLaunches, getLiveLaunches, getNextLaunch } from '@/lib/api';
import type { Launch } from '@/lib/types';

type CacheKey = 'all' | 'live' | 'next';
type CacheValueMap = {
  all: Launch[];
  live: Launch[];
  next: Launch | null;
};

type CacheEntry = {
  data: Launch[] | Launch | null;
  timestamp: number;
};

const serverCache: Partial<Record<CacheKey, CacheEntry>> = {};

const CACHE_DURATIONS: Record<CacheKey, number> = {
  all: 30 * 60 * 1000,
  live: 2 * 60 * 1000,
  next: 5 * 60 * 1000,
};

function getCached<K extends CacheKey>(key: K): CacheValueMap[K] | null {
  const cached = serverCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATIONS[key]) {
    return cached.data as CacheValueMap[K];
  }
  return null;
}

function setCache<K extends CacheKey>(key: K, data: CacheValueMap[K]) {
  serverCache[key] = { data, timestamp: Date.now() };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // all, live, or next

    // Check server cache first
    if (type === 'all') {
      const cached = getCached('all');
      if (cached) {
        return NextResponse.json({
          launches: cached,
          cached: true,
          source: 'server-cache'
        });
      }

      const launches = await getAllUpcomingLaunches();
      setCache('all', launches);

      return NextResponse.json({
        launches,
        cached: false,
        source: 'api'
      });
    }

    if (type === 'live') {
      const cached = getCached('live');
      if (cached) {
        return NextResponse.json({
          launches: cached,
          cached: true,
          source: 'server-cache'
        });
      }

      const launches = await getLiveLaunches();
      setCache('live', launches);

      return NextResponse.json({
        launches,
        cached: false,
        source: 'api'
      });
    }

    if (type === 'next') {
      const cached = getCached('next');
      if (cached) {
        return NextResponse.json({
          launch: cached,
          cached: true,
          source: 'server-cache'
        });
      }

      const launch = await getNextLaunch();
      setCache('next', launch);

      return NextResponse.json({
        launch,
        cached: false,
        source: 'api'
      });
    }

    return NextResponse.json(
      { error: 'Invalid type parameter. Use: all, live, or next' },
      { status: 400 }
    );
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch launches' },
      { status: 500 }
    );
  }
}
