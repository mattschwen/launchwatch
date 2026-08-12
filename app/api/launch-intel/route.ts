import { NextRequest, NextResponse } from 'next/server';
import { getLaunchIntel } from '@/lib/launch-intel';
import { getLaunchIdFromIntelParams } from '@/lib/launch-intel-params';
import { getLaunchByIdResult, parseLaunchId } from '@/lib/api';
import { checkRequestRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import type { LaunchFeedMeta } from '@/lib/types';

function responseCacheControl(meta: LaunchFeedMeta): string {
  return meta.partial || meta.stale
    ? 'private, no-store'
    : 's-maxage=120, stale-while-revalidate=600';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keys = [...searchParams.keys()];
  if (
    keys.some((key) => key !== 'id') ||
    searchParams.getAll('id').length !== 1
  ) {
    return NextResponse.json(
      { error: 'Only one canonical launch ID is accepted' },
      { status: 400 },
    );
  }
  const requestedId = getLaunchIdFromIntelParams(searchParams);
  const parsedId = parseLaunchId(requestedId);

  if (!requestedId || !parsedId) {
    return NextResponse.json(
      { error: 'A valid canonical launch ID is required' },
      { status: 400 },
    );
  }

  const rateLimit = checkRequestRateLimit(request.headers, {
    namespace: 'launch-intel',
    limit: 8,
    globalLimit: 600,
    windowMs: 10 * 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many intelligence requests. Try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  try {
    const launchResult = await getLaunchByIdResult(parsedId.canonicalId);
    const provider = launchResult.meta.providers[parsedId.source];

    if (launchResult.notFound) {
      return NextResponse.json(
        { error: 'Launch not found' },
        { status: 404 },
      );
    }

    if (!launchResult.data || provider.state === 'error') {
      return NextResponse.json(
        {
          error: 'Launch provider is unavailable',
          meta: launchResult.meta,
        },
        { status: 502 },
      );
    }

    const intel = await getLaunchIntel(launchResult.data);

    return NextResponse.json(intel, {
      headers: {
        'Cache-Control': responseCacheControl(launchResult.meta),
        ...rateLimitHeaders(rateLimit),
        'X-LaunchWatch-Canonical-Id': parsedId.canonicalId,
        'X-LaunchWatch-Data-State': launchResult.meta.stale ? 'stale' : 'fresh',
      },
    });
  } catch (error) {
    console.error('Failed to build launch intel:', error);
    return NextResponse.json(
      { error: 'Failed to build launch intelligence' },
      { status: 500 }
    );
  }
}
