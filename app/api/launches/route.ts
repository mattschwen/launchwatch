import { NextRequest, NextResponse } from 'next/server';
import { getAllUpcomingLaunches, getLiveLaunches, getNextLaunch } from '@/lib/api';

// Server-side cache (shared across all users!)
let serverCache: {
  all?: { data: any; timestamp: number };
  live?: { data: any; timestamp: number };
  next?: { data: any; timestamp: number };
} = {};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getCached(key: 'all' | 'live' | 'next') {
  const cached = serverCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCache(key: 'all' | 'live' | 'next', data: any) {
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
