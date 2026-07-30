import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoverageSignal from '@/components/launch/CoverageSignal';
import type { LaunchIntel } from '@/lib/types';
import { LAUNCH_INTEL } from '../fixtures/launches';

function makeIntel(
  overrides: Partial<LaunchIntel> = {}
): LaunchIntel {
  return {
    ...LAUNCH_INTEL,
    ...overrides,
    summary: {
      ...LAUNCH_INTEL.summary,
      ...overrides.summary,
    },
  };
}

describe('CoverageSignal', () => {
  it('reports discrete live coverage state and exact source counts', () => {
    const intel = makeIntel({
      summary: {
        ...LAUNCH_INTEL.summary,
        streamState: 'live',
      },
      streamCandidates: [
        {
          id: 'stream-1',
          title: 'Provider broadcast',
          url: 'https://example.test/live',
          channelTitle: 'Provider',
          source: 'provided',
          confidence: 'high',
          liveStatus: 'live',
        },
        {
          id: 'stream-2',
          title: 'Mission coverage',
          url: 'https://example.test/coverage',
          channelTitle: 'Coverage desk',
          source: 'youtube-api',
          confidence: 'medium',
          liveStatus: 'unknown',
        },
      ],
      newsItems: [
        {
          id: 'news-1',
          title: 'Mission update',
          url: 'https://example.test/news',
          source: 'Mission desk',
          publishedAt: '2035-07-26T12:00:00.000Z',
        },
      ],
      socialItems: [
        {
          id: 'social-1',
          platform: 'reddit',
          title: 'Mission thread',
          url: 'https://example.test/social/1',
        },
        {
          id: 'social-2',
          platform: 'x',
          title: 'Provider post',
          url: 'https://example.test/social/2',
        },
        {
          id: 'social-3',
          platform: 'reddit',
          title: 'Launch discussion',
          url: 'https://example.test/social/3',
        },
      ],
    });

    const { container } = render(<CoverageSignal intel={intel} />);

    expect(
      screen.getByRole('group', { name: 'Coverage signal' })
    ).toBeVisible();
    expect(screen.getByText('Live broadcast identified')).toBeVisible();
    expect(screen.getByText('Stream leads').nextElementSibling).toHaveTextContent(
      '2'
    );
    expect(screen.getByText('News reports').nextElementSibling).toHaveTextContent(
      '1'
    );
    expect(
      screen.getByText('Community posts').nextElementSibling
    ).toHaveTextContent('3');

    const visual = container.querySelector('.coverage-signal-visual');
    expect(visual).toHaveAttribute('aria-hidden', 'true');
    expect(visual?.querySelector('.coverage-signal-stream')).toHaveAttribute(
      'data-state',
      'live'
    );
    expect(visual?.querySelectorAll('.coverage-signal-active')).toHaveLength(3);
  });

  it('renders an honest empty signal without implying coverage', () => {
    const intel = makeIntel({
      summary: {
        ...LAUNCH_INTEL.summary,
        streamState: 'none',
      },
      streamCandidates: [],
      newsItems: [],
      socialItems: [],
    });

    const { container } = render(<CoverageSignal intel={intel} />);

    expect(screen.getByText('No stream lead')).toBeVisible();
    expect(container.querySelectorAll('.coverage-signal-active')).toHaveLength(0);
    expect(container.querySelectorAll('.coverage-signal-empty')).toHaveLength(3);
    expect(
      screen.getAllByRole('definition').map((definition) => definition.textContent)
    ).toEqual(['0', '0', '0']);
  });
});
