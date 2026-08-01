import { describe, expect, it } from 'vitest';
import { summarizeStreamCandidates } from '@/lib/launch-intel';
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
