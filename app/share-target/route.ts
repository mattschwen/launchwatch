import { NextRequest, NextResponse } from 'next/server';
import { getShareTargetSearch } from '@/lib/share-target';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let search = '';

  try {
    search = getShareTargetSearch(await request.formData());
  } catch {
    // Malformed share payloads still recover to the schedule.
  }

  const destination = new URL('/', request.url);
  if (search) destination.searchParams.set('q', search);

  return NextResponse.redirect(destination, 303);
}
