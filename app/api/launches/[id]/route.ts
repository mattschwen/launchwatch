import { NextRequest, NextResponse } from 'next/server';
import { getLaunchByIdResult, parseLaunchId } from '@/lib/api';
import { getLaunchDetailQueryError } from '@/lib/launch-detail-params';
import { checkRequestRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const queryError = getLaunchDetailQueryError(request.nextUrl.searchParams);
  if (queryError) {
    return NextResponse.json({ error: queryError }, { status: 400 });
  }

  const parsed = parseLaunchId(id);

  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid launch ID' },
      { status: 400 },
    );
  }

  const rateLimit = checkRequestRateLimit(request.headers, {
    namespace: 'launch-detail',
    limit: 30,
    globalLimit: 180,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many launch detail requests. Try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  try {
    const result = await getLaunchByIdResult(parsed.canonicalId);
    const provider = result.meta.providers[parsed.source];

    if (result.notFound) {
      return NextResponse.json(
        {
          error: 'Launch not found',
          launch: null,
          canonicalId: parsed.canonicalId,
          meta: result.meta,
        },
        { status: 404 },
      );
    }

    if (!result.data || provider.state === 'error') {
      return NextResponse.json(
        {
          error: 'Launch provider is unavailable',
          launch: null,
          canonicalId: parsed.canonicalId,
          meta: result.meta,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        launch: result.data,
        canonicalId: parsed.canonicalId,
        legacyId: parsed.legacy,
        cached: result.meta.cached,
        source: result.meta.stale
          ? 'stale-cache'
          : result.meta.cached
            ? 'server-cache'
            : 'api',
        meta: result.meta,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
          ...rateLimitHeaders(rateLimit),
          ...(parsed.legacy ? { 'Content-Location': `/api/launches/${parsed.canonicalId}` } : {}),
        },
      },
    );
  } catch (error) {
    console.error('Launch detail API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch launch details' },
      { status: 500 },
    );
  }
}
