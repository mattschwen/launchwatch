import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLaunchIntel,
  getLaunchIntelMissionName,
  isMissionSpecificCoverage,
  summarizeStreamCandidates,
} from '@/lib/launch-intel';
import {
  publicLaunchIntelRationale,
  STREAM_VERIFICATION_UNAVAILABLE_RATIONALE,
} from '@/lib/launch-intel-copy';
import type { Launch, LaunchStreamCandidate } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '@/tests/fixtures/launches';

function candidate(
  overrides: Partial<LaunchStreamCandidate> = {}
): LaunchStreamCandidate {
  return {
    id: 'candidate',
    title: 'Mission coverage',
    url: 'https://www.youtube.com/watch?v=mission',
    channelTitle: 'Mission provider',
    source: 'youtube-api',
    confidence: 'medium',
    liveStatus: 'unknown',
    ...overrides,
  };
}

describe('stream candidate summaries', () => {
  it.each([
    'Search fallback because no YouTube Data API key is configured.',
    'The daily YouTube verification budget is exhausted.',
    'Provider credentials are missing from the current configuration.',
  ])('keeps internal stream-verification details out of public copy', (reason) => {
    expect(publicLaunchIntelRationale(reason)).toBe(
      STREAM_VERIFICATION_UNAVAILABLE_RATIONALE
    );
    expect(publicLaunchIntelRationale(reason)).not.toMatch(
      /api key|credential|configured|configuration|budget|quota/i
    );
  });

  it('sanitizes a candidate note before using it as the public summary', () => {
    const summary = summarizeStreamCandidates([
      candidate({
        source: 'search',
        note: 'Search fallback because no YouTube Data API key is configured.',
      }),
    ]);

    expect(summary.rationale).toBe(
      STREAM_VERIFICATION_UNAVAILABLE_RATIONALE
    );
  });

  it('labels a generic YouTube results page as search, not a stream lead', () => {
    const summary = summarizeStreamCandidates([
      candidate({
        source: 'search',
        title: 'YouTube search fallback',
        url: 'https://www.youtube.com/results?search_query=Orbital+Dawn',
        confidence: 'low',
        note: 'Search fallback because verification is unavailable.',
      }),
    ]);

    expect(summary).toMatchObject({
      streamState: 'search',
      recommendedLabel: 'Search YouTube',
      recommendedUrl:
        'https://www.youtube.com/results?search_query=Orbital+Dawn',
      rationale: 'Search fallback because verification is unavailable.',
    });
  });

  it('preserves the direct action for a ranked provider stream', () => {
    expect(
      summarizeStreamCandidates([
        candidate({ source: 'provided', confidence: 'medium' }),
      ])
    ).toMatchObject({
      streamState: 'standby',
      recommendedLabel: 'Open Provider Stream',
      recommendedUrl: 'https://www.youtube.com/watch?v=mission',
    });
  });
});

describe('mission intelligence relevance', () => {
  const iqpsLaunch: Launch = {
    ...UPCOMING_LAUNCHES[0],
    id: 'll2-iqps-7',
    sourceId: 'iqps-7',
    name: 'Electron | The Grain Goddess Provides (iQPS Launch 7)',
    missionName: 'The Grain Goddess Provides (iQPS Launch 7)',
    rocket: 'Electron',
    provider: 'Rocket Lab',
    date: '2026-08-06T09:00:00.000Z',
    dateUnix: 1786006800,
  };

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the structured mission instead of the vehicle prefix', () => {
    expect(getLaunchIntelMissionName(iqpsLaunch)).toBe(
      'The Grain Goddess Provides (iQPS Launch 7)'
    );
    expect(
      getLaunchIntelMissionName({
        ...iqpsLaunch,
        missionName: null,
      })
    ).toBe('The Grain Goddess Provides (iQPS Launch 7)');
  });

  it('accepts coverage anchored by a distinctive mission identifier', () => {
    expect(
      isMissionSpecificCoverage(
        iqpsLaunch,
        'Rocket Lab wins another launch contract from Japan’s iQPS'
      )
    ).toBe(true);
  });

  it('rejects another mission that only shares the provider and vehicle', () => {
    expect(
      isMissionSpecificCoverage(
        iqpsLaunch,
        'ESA launches first Celeste satellites aboard a Rocket Lab Electron'
      )
    ).toBe(false);
  });

  it('requires a real mission anchor for generic provider labels', () => {
    expect(
      isMissionSpecificCoverage(
        {
          ...iqpsLaunch,
          name: 'Long March 7A | Unknown Payload',
          missionName: 'Unknown Payload',
          rocket: 'Long March 7A',
          provider: 'China Aerospace Science and Technology Corporation',
        },
        'Long March launch provider prepares another unknown payload'
      )
    ).toBe(false);
  });

  it('keeps same-vehicle news caches isolated by mission', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T08:00:00.000Z'));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('spaceflightnewsapi.net')) {
        return Response.json({
          results: [
            {
              id: 39244,
              title:
                'Rocket Lab wins another launch contract from Japan’s iQPS',
              url: 'https://example.test/iqps',
              news_site: 'SpaceNews',
              published_at: '2026-07-30T11:59:29.000Z',
              summary: 'The new iQPS mission will fly on Electron.',
            },
            {
              id: 39245,
              title: 'Launch of ESA’s Celeste Mission 1 aboard Electron',
              url: 'https://example.test/celeste',
              news_site: 'ESA',
              published_at: '2026-08-01T10:20:00.000Z',
              summary: 'Celeste Mission 1 is preparing for launch.',
            },
          ],
        });
      }

      return Response.json({ data: { children: [] } });
    });

    const iqpsIntel = await getLaunchIntel(iqpsLaunch);
    const celesteIntel = await getLaunchIntel({
      ...iqpsLaunch,
      id: 'll2-celeste-1',
      sourceId: 'celeste-1',
      name: 'Electron | Celeste Mission 1',
      missionName: 'Celeste Mission 1',
      date: '2026-08-07T09:00:00.000Z',
      dateUnix: 1786093200,
    });

    expect(iqpsIntel.newsItems.map((item) => item.id)).toEqual(['39244']);
    expect(celesteIntel.newsItems.map((item) => item.id)).toEqual(['39245']);
  });
});
