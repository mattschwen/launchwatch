import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LaunchList from '@/components/LaunchList';
import { useLaunches } from '@/lib/hooks';
import { FEED_META, UPCOMING_LAUNCHES } from '../fixtures/launches';

vi.mock('@/lib/hooks', () => ({
  useLaunches: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LaunchList', () => {
  it('finds missions by profile and orbit metadata', async () => {
    const user = userEvent.setup();

    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search launches' }),
      'communications low earth',
    );

    expect(screen.getByText('Orbital Dawn')).toBeVisible();
    expect(screen.queryByText('Polaris Relay')).not.toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' }),
    ).toHaveTextContent('1 mission');
  });

  it('keeps active schedule filters visible when the controls are collapsed', async () => {
    const user = userEvent.setup();

    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search launches' }),
      'Polaris',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort launches' }),
      'name-asc',
    );

    const hideFilters = screen.getByRole('button', {
      name: 'Hide filters, 2 active',
    });
    expect(hideFilters).toHaveTextContent('2');
    await user.click(hideFilters);

    const collapsedFilters = screen.getByRole('button', {
      name: 'Filter, 2 active',
    });
    expect(collapsedFilters).toHaveTextContent('2');
    expect(
      screen.queryByRole('searchbox', { name: 'Search launches' }),
    ).not.toBeInTheDocument();
  });

  it('reconciles filters when history navigation changes the URL context', () => {
    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <LaunchList
        initialFilters={{
          search: 'Polaris',
          provider: 'all',
          status: 'all',
          sortBy: 'date-asc',
        }}
      />,
    );

    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' }),
    ).toHaveTextContent('1 mission');

    window.history.pushState(null, '', '/');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));

    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' }),
    ).toHaveTextContent('2 missions');
    expect(
      screen.queryByRole('searchbox', { name: 'Search launches' }),
    ).not.toBeInTheDocument();
  });

  it('announces and reveals a large mission queue in focused batches', async () => {
    const user = userEvent.setup();
    const launches = Array.from({ length: 12 }, (_, index) => ({
      ...UPCOMING_LAUNCHES[index % UPCOMING_LAUNCHES.length],
      id: `schedule-mission-${index + 1}`,
      sourceId: `schedule-mission-${index + 1}`,
      name: `Schedule Mission ${index + 1}`,
      dateUnix: UPCOMING_LAUNCHES[0].dateUnix + index,
    }));

    vi.mocked(useLaunches).mockReturnValue({
      launches,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' })
    ).toHaveTextContent('Showing 5 of 12 missions');
    expect(screen.getByText('Schedule Mission 5')).toBeVisible();
    expect(screen.queryByText('Schedule Mission 6')).not.toBeInTheDocument();

    const loadMore = screen.getByRole('button', { name: 'Load 5 more' });
    loadMore.focus();
    await user.keyboard('{Enter}');

    expect(loadMore).toHaveFocus();
    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' })
    ).toHaveTextContent('Showing 10 of 12 missions');
    expect(screen.getByText('Schedule Mission 10')).toBeVisible();
    expect(screen.queryByText('Schedule Mission 11')).not.toBeInTheDocument();
    expect(loadMore).toHaveAccessibleName('Load 2 more');

    await user.keyboard('{Enter}');

    expect(loadMore).toHaveFocus();
    expect(loadMore).toHaveAccessibleName('All 12 missions loaded');
    expect(loadMore).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' })
    ).toHaveTextContent('12 missions');
    expect(screen.getByText('Schedule Mission 12')).toBeVisible();
  });

  it('labels retained missions and keeps retry focus after another failure', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      loading: false,
      refreshing: false,
      error: 'Provider maintenance',
      meta: FEED_META,
      refresh,
    });

    render(<LaunchList />);

    const schedule = screen
      .getByRole('heading', { name: 'Upcoming launches' })
      .closest('section');
    expect(schedule).toHaveClass('signal-warm');
    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' })
    ).toHaveTextContent(
      '2 missions · refresh failed; showing last-known schedule'
    );
    expect(screen.getByText('Showing the last-known mission schedule.')).toBeVisible();

    const retry = screen.getByRole('button', { name: 'Retry feed' });
    await user.click(retry);
    expect(refresh).toHaveBeenCalledOnce();
    expect(retry).toHaveFocus();
  });

  it('cancels the deferred retry scroll when the schedule unmounts', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const frame = 73;
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockReturnValue(frame);
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      loading: false,
      refreshing: false,
      error: 'Provider maintenance',
      meta: FEED_META,
      refresh,
    });

    const view = render(<LaunchList />);
    await user.click(screen.getByRole('button', { name: 'Retry feed' }));

    expect(requestFrame).toHaveBeenCalledOnce();
    view.unmount();
    expect(cancelFrame).toHaveBeenCalledWith(frame);
  });
});
