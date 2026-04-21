import { NextRequest, NextResponse } from 'next/server';
import { getLaunchIntel } from '@/lib/launch-intel';
import { launchFromIntelParams } from '@/lib/launch-intel-params';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const launch = launchFromIntelParams(searchParams);
    const intel = await getLaunchIntel(launch);

    return NextResponse.json(intel, {
      headers: {
        'Cache-Control': 's-maxage=120, stale-while-revalidate=600',
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
