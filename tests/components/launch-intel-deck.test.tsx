import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import { LAUNCH_INTEL, UPCOMING_LAUNCHES } from '../fixtures/launches';

const launch = UPCOMING_LAUNCHES[0];

describe('LaunchIntelDeck', () => {
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
        name: LAUNCH_INTEL.summary.recommendedLabel,
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
        name: LAUNCH_INTEL.summary.recommendedLabel,
      })
    ).toHaveClass('action-button-secondary');
  });
});
