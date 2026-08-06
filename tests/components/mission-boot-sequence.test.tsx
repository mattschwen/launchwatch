import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MissionBootSequence from '@/components/layout/MissionBootSequence';
import { FEED_META, UPCOMING_LAUNCHES } from '../fixtures/launches';

const useLaunchDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/contexts', () => ({
  useLaunchData: useLaunchDataMock,
}));

function readyFeed(meta = FEED_META): void {
  useLaunchDataMock.mockReturnValue({
    launches: UPCOMING_LAUNCHES,
    loading: false,
    refreshing: false,
    error: null,
    meta,
    refresh: vi.fn(),
  });
}

beforeEach(() => {
  useLaunchDataMock.mockReset();
});

describe('MissionBootSequence', () => {
  it('confirms the first successful synchronization without blocking reduced-motion users', async () => {
    readyFeed();
    const user = userEvent.setup();

    render(<MissionBootSequence />);

    const message = await screen.findByRole('status');
    expect(message).toHaveTextContent('Launch schedule synchronized');
    expect(
      screen.getByRole('complementary', { name: 'MISSION CONTROL' })
    ).toBeVisible();
    expect(window.localStorage.getItem('launchwatch.boot-sequence.v3')).toBe(
      'done'
    );

    await user.click(
      screen.getByRole('button', { name: 'Dismiss system status' })
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reports partial and retained provider data honestly', async () => {
    readyFeed({ ...FEED_META, partial: true });
    const { unmount } = render(<MissionBootSequence />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Partial provider schedule loaded'
    );

    unmount();
    window.localStorage.clear();
    readyFeed({ ...FEED_META, stale: true });
    render(<MissionBootSequence />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Retained provider schedule loaded'
    );
  });

  it('does not announce an unresolved, failed, or previously seen feed', () => {
    useLaunchDataMock.mockReturnValue({
      launches: [],
      loading: true,
      refreshing: false,
      error: null,
      meta: null,
      refresh: vi.fn(),
    });
    const { rerender } = render(<MissionBootSequence />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    useLaunchDataMock.mockReturnValue({
      launches: [],
      loading: false,
      refreshing: false,
      error: 'Provider unavailable',
      meta: null,
      refresh: vi.fn(),
    });
    rerender(<MissionBootSequence />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    window.localStorage.setItem('launchwatch.boot-sequence.v3', 'done');
    readyFeed();
    rerender(<MissionBootSequence />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
