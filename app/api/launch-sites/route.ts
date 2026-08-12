import { NextRequest, NextResponse } from 'next/server';
import { getLaunchByIdResult, parseLaunchId } from '@/lib/api';
import { getNearbyLaunchSites } from '@/lib/launch-sites';
import { checkRequestRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

function responseCacheControl(
  launchMeta: { partial: boolean; stale: boolean },
  atlasMeta: { stale: boolean },
): string {
  return launchMeta.partial || launchMeta.stale || atlasMeta.stale
    ? 'private, no-store'
    : 'public, s-maxage=21600, stale-while-revalidate=86400';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if ([...searchParams.keys()].some((key) => key !== 'id') || searchParams.getAll('id').length !== 1) {
    return NextResponse.json({ error: 'Only one canonical launch ID is accepted' }, { status: 400 });
  }

  const parsed = parseLaunchId(searchParams.get('id') || '');
  if (!parsed) {
    return NextResponse.json({ error: 'A valid canonical launch ID is required' }, { status: 400 });
  }

  const rateLimit = checkRequestRateLimit(request.headers, {
    namespace: 'launch-sites',
    limit: 240,
    globalLimit: 5_000,
    windowMs: 10 * 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many launch-site requests. Try again later.' }, {
      status: 429,
      headers: rateLimitHeaders(rateLimit),
    });
  }

  try {
    const launchResult = await getLaunchByIdResult(parsed.canonicalId);
    if (launchResult.notFound) return NextResponse.json({ error: 'Launch not found' }, { status: 404 });
    if (!launchResult.data) return NextResponse.json({ error: 'Launch provider is unavailable' }, { status: 502 });
    if (!launchResult.data.location) return NextResponse.json({ error: 'Launch coordinates are unavailable' }, { status: 422 });

    const atlas = await getNearbyLaunchSites(launchResult.data.location);
    return NextResponse.json(atlas, {
      headers: {
        'Cache-Control': responseCacheControl(launchResult.meta, atlas.meta),
        ...rateLimitHeaders(rateLimit),
        'X-LaunchWatch-Canonical-Id': parsed.canonicalId,
        'X-LaunchWatch-Data-State': atlas.meta.stale ? 'stale' : 'fresh',
      },
    });
  } catch (error) {
    console.error('Failed to load nearby launch sites:', error);
    return NextResponse.json({ error: 'Nearby launch sites are unavailable' }, { status: 502 });
  }
}
