import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import { LAUNCH_INTEL, UPCOMING_LAUNCHES } from '../fixtures/launches';

const launch = UPCOMING_LAUNCHES[0];

describe('LaunchIntelDeck', () => {
  it('identifies the mission intelligence loading state visibly and accessibly', () => {
    render(<LaunchIntelDeck launch={launch} intel={null} loading />);

    const region = screen.getByRole('region', {
      name: 'Mission intelligence',
    });
    const description = screen.getByRole('status');

    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveAttribute(
      'aria-describedby',
      'mission-intelligence-loading-description'
    );
    expect(screen.getByText('Signal acquisition')).toBeVisible();
    expect(description).toHaveTextContent(
      `Correlating verified public coverage for ${launch.name}.`
    );
  });

  it('includes the truthful coverage signal with exact source counts', () => {
    render(<LaunchIntelDeck launch={launch} intel={LAUNCH_INTEL} />);

    const signal = screen.getByRole('group', { name: 'Coverage signal' });
    expect(signal).toBeVisible();
    expect(within(signal).getByText('Stream leads').nextElementSibling).toHaveTextContent(
      String(LAUNCH_INTEL.streamCandidates.length)
    );
    expect(within(signal).getByText('News reports').nextElementSibling).toHaveTextContent(
      String(LAUNCH_INTEL.newsItems.length)
    );
    expect(
      within(signal).getByText('Community posts').nextElementSibling
    ).toHaveTextContent(String(LAUNCH_INTEL.socialItems.length));
  });

  it('distinguishes an intelligence-feed error from an honest empty result', () => {
    const { rerender } = render(
      <LaunchIntelDeck
        launch={launch}
        intel={null}
        error="Coverage provider unavailable"
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Coverage signals could not be checked'
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Coverage provider unavailable'
    );
    expect(
      screen.queryByText(/No verified stream, coverage, or community signal/)
    ).not.toBeInTheDocument();

    rerender(<LaunchIntelDeck launch={launch} intel={null} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByText(/No verified stream, coverage, or community signal/)
    ).toBeVisible();
  });

  it('keeps recovery stable and moves focus to restored intelligence', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <LaunchIntelDeck
        launch={launch}
        intel={null}
        error="Coverage provider unavailable"
        onRetry={onRetry}
      />
    );

    const retry = screen.getByRole('button', { name: 'Retry coverage' });
    retry.focus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <LaunchIntelDeck
        launch={launch}
        intel={null}
        loading
        error="Coverage provider unavailable"
        onRetry={onRetry}
      />
    );

    const retrying = screen.getByRole('button', { name: 'Retrying coverage…' });
    expect(retrying).toHaveFocus();
    expect(retrying).toHaveAttribute('aria-disabled', 'true');
    expect(retrying).toHaveAttribute('aria-busy', 'true');
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <LaunchIntelDeck
        launch={launch}
        intel={LAUNCH_INTEL}
        onRetry={onRetry}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Mission intelligence' })
      ).toHaveFocus()
    );
  });

  it('keeps rate-limited recovery honest until the server window opens', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <LaunchIntelDeck
        launch={launch}
        intel={null}
        error="Too many intelligence requests. Try again later."
        retryAt={Date.now() + 120_000}
        onRetry={onRetry}
      />
    );

    const waiting = screen.getByRole('button', { name: 'Retry in 2m' });
    expect(waiting).toHaveAttribute('aria-disabled', 'true');
    await user.click(waiting);
    expect(onRetry).not.toHaveBeenCalled();

    rerender(
      <LaunchIntelDeck
        launch={launch}
        intel={null}
        error="Too many intelligence requests. Try again later."
        retryAt={null}
        onRetry={onRetry}
      />
    );

    const available = screen.getByRole('button', { name: 'Retry coverage' });
    expect(available).toHaveAttribute('aria-disabled', 'false');
    await user.click(available);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('uses the stream action treatment only for identified live coverage', () => {
    const { rerender } = render(
      <LaunchIntelDeck
        launch={launch}
        intel={{
          ...LAUNCH_INTEL,
          summary: {
            ...LAUNCH_INTEL.summary,
            streamState: 'live',
          },
        }}
      />
    );

    expect(
      screen.getByRole('link', {
        name: new RegExp(
          `${LAUNCH_INTEL.summary.recommendedLabel}.*new tab`,
          'i'
        ),
      })
    ).toHaveClass('action-button-stream');

    rerender(
      <LaunchIntelDeck
        launch={launch}
        intel={{
          ...LAUNCH_INTEL,
          summary: {
            ...LAUNCH_INTEL.summary,
            streamState: 'standby',
          },
        }}
      />
    );

    expect(
      screen.getByRole('link', {
        name: new RegExp(
          `${LAUNCH_INTEL.summary.recommendedLabel}.*new tab`,
          'i'
        ),
      })
    ).toHaveClass('action-button-secondary');
  });

  it('keeps complete stream and channel identities readable', () => {
    const streamTitle =
      'Polaris Relay Mission Official Launch Coverage and Preflight Briefing';
    const channelTitle = 'International Orbital Communications Directorate';

    render(
      <LaunchIntelDeck
        launch={launch}
        intel={{
          ...LAUNCH_INTEL,
          streamCandidates: [
            {
              id: 'official-test',
              title: streamTitle,
              url: 'https://www.youtube.com/watch?v=official-test',
              channelTitle,
              source: 'youtube-api',
              confidence: 'high',
              liveStatus: 'upcoming',
            },
          ],
        }}
      />
    );

    const streamLink = screen.getByRole('link', {
      name: new RegExp(streamTitle),
    });
    const title = within(streamLink).getByText(streamTitle);
    const channel = within(streamLink).getByText(
      `${channelTitle} · high confidence`
    );

    expect(streamLink).toHaveClass('min-w-0');
    expect(title).toHaveClass('break-words');
    expect(title).not.toHaveClass('truncate');
    expect(channel).toHaveClass('break-words');
    expect(channel).not.toHaveClass('truncate');
  });

  it('identifies new-tab behavior for every external intelligence action', () => {
    const { container } = render(
      <LaunchIntelDeck
        launch={launch}
        intel={{
          ...LAUNCH_INTEL,
          streamCandidates: [
            {
              id: 'official-test',
              title: 'Official mission stream',
              url: 'https://www.youtube.com/watch?v=official-test',
              channelTitle: 'Mission provider',
              source: 'youtube-api',
              confidence: 'high',
              liveStatus: 'upcoming',
            },
          ],
          newsItems: [
            {
              id: 'news-test',
              title: 'Mission coverage report',
              url: 'https://example.test/news',
              source: 'Example News',
              publishedAt: '2035-07-26T12:00:00.000Z',
              summary: null,
            },
          ],
          socialItems: [
            {
              id: 'social-test',
              platform: 'reddit',
              title: 'Mission community thread',
              url: 'https://www.reddit.com/r/space/comments/social-test',
              publishedAt: '2035-07-26T12:00:00.000Z',
              author: 'observer',
              community: 'r/space',
              note: null,
            },
          ],
        }}
      />
    );

    const externalLinks = container.querySelectorAll('a[target="_blank"]');
    expect(externalLinks.length).toBeGreaterThan(0);
    externalLinks.forEach((link) => {
      expect(link).toHaveAccessibleName(/new tab/i);
    });
  });

  it('lets users inspect every ranked stream and community signal', async () => {
    const user = userEvent.setup();
    const streamCandidates = Array.from({ length: 5 }, (_, index) => ({
      id: `stream-${index + 1}`,
      title: `Ranked stream ${index + 1}`,
      url: `https://www.youtube.com/watch?v=stream-${index + 1}`,
      channelTitle: `Channel ${index + 1}`,
      source: 'youtube-api' as const,
      confidence: 'high' as const,
      liveStatus: 'upcoming' as const,
    }));
    const socialItems = Array.from({ length: 6 }, (_, index) => ({
      id: `social-${index + 1}`,
      platform: 'reddit' as const,
      title: `Community signal ${index + 1}`,
      url: `https://www.reddit.com/r/space/comments/social-${index + 1}`,
      publishedAt: '2035-07-26T12:00:00.000Z',
      author: `observer-${index + 1}`,
      community: 'r/space',
      note: null,
    }));

    const { rerender } = render(
      <LaunchIntelDeck
        launch={launch}
        intel={{ ...LAUNCH_INTEL, streamCandidates, socialItems }}
      />
    );

    expect(screen.getByRole('link', { name: /Ranked stream 4/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Ranked stream 5/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Community signal 4/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Community signal 5/ })).toBeNull();

    const showStreams = screen.getByRole('button', {
      name: 'Show all 5 stream leads',
    });
    expect(showStreams).toHaveAttribute('aria-expanded', 'false');
    await user.click(showStreams);
    expect(screen.getByRole('link', { name: /Ranked stream 5/ })).toBeVisible();
    expect(showStreams).toHaveAttribute('aria-expanded', 'true');
    expect(showStreams).toHaveAccessibleName('Show fewer stream leads');

    const showSocial = screen.getByRole('button', {
      name: 'Show all 6 community signals',
    });
    await user.click(showSocial);
    expect(screen.getByRole('link', { name: /Community signal 6/ })).toBeVisible();
    expect(showSocial).toHaveAccessibleName('Show fewer community signals');

    rerender(
      <LaunchIntelDeck
        launch={UPCOMING_LAUNCHES[1]}
        intel={{ ...LAUNCH_INTEL, streamCandidates, socialItems }}
      />
    );
    expect(screen.queryByRole('link', { name: /Ranked stream 5/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Community signal 6/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Show all 5 stream leads' })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('presents a generic search as a fallback instead of a stream lead', () => {
    render(
      <LaunchIntelDeck
        launch={launch}
        intel={{
          ...LAUNCH_INTEL,
          summary: {
            ...LAUNCH_INTEL.summary,
            streamState: 'search',
            recommendedLabel: 'Search YouTube',
          },
          streamCandidates: [
            {
              id: 'search-fallback',
              title: 'YouTube search fallback',
              url: 'https://www.youtube.com/results?search_query=Orbital+Dawn',
              channelTitle: 'YouTube',
              source: 'search',
              confidence: 'low',
              liveStatus: 'unknown',
            },
          ],
        }}
      />
    );

    expect(
      screen.getByRole('link', { name: /Search YouTube.*new tab/i })
    ).toBeVisible();
    expect(screen.queryByText('YouTube search fallback')).not.toBeInTheDocument();
    expect(
      screen.getByText(/No verified broadcast has been ranked yet/)
    ).toBeVisible();
    const signal = screen.getByRole('group', { name: 'Coverage signal' });
    expect(
      within(signal).getByText('Stream leads').nextElementSibling
    ).toHaveTextContent('0');
  });

  it('replaces internal verification details with public degraded-state copy', () => {
    render(
      <LaunchIntelDeck
        launch={launch}
        intel={{
          ...LAUNCH_INTEL,
          summary: {
            ...LAUNCH_INTEL.summary,
            rationale:
              'Search fallback because no YouTube Data API key is configured.',
          },
        }}
      />
    );

    expect(
      screen.getByText(
        'Automatic stream verification is unavailable. Use the mission-specific search to check current coverage.'
      )
    ).toBeVisible();
    expect(screen.queryByText(/API key|configured/i)).not.toBeInTheDocument();
  });
});
