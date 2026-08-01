import { describe, expect, it } from 'vitest';
import { summarizeStreamCandidates } from '@/lib/launch-intel';
import {
  publicLaunchIntelRationale,
  STREAM_VERIFICATION_UNAVAILABLE_RATIONALE,
} from '@/lib/launch-intel-copy';
import type { LaunchStreamCandidate } from '@/lib/types';

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
