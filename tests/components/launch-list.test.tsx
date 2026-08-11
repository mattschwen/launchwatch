import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LaunchList from '@/components/LaunchList';
import { useLaunches } from '@/lib/hooks';
import { FEED_META, UPCOMING_LAUNCHES } from '../fixtures/launches';

vi.mock('next/link', async () => {
  const React = await import('react');

  return {
    default: React.forwardRef<
      HTMLAnchorElement,
      React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        href: string;
        prefetch?: boolean | null;
      }
    >(function MockLink(
      { children, href, prefetch, ...props },
      ref,
    ) {
      return (
        <a
          {...props}
          ref={ref}
          href={href}
          data-prefetch={prefetch === null ? 'auto' : String(prefetch)}
        >
          {children}
        </a>
      );
    }),
  };
});

vi.mock('@/lib/hooks', () => ({
  useLaunches: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LaunchList', () => {
  it('loads secondary mission details only after activation', () => {
    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      online: true,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    for (const launch of UPCOMING_LAUNCHES) {
      expect(
        screen.getByRole('link', { name: new RegExp(launch.name) })
      ).toHaveAttribute('data-prefetch', 'false');
    }
  });

  it('adds distinct site and viewer time context to exact upcoming rows', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Denver',
      hourCycle: 'h12',
      hour12: true,
    });
    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      online: true,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    for (const launch of UPCOMING_LAUNCHES) {
      const mission = screen.getByRole('link', {
        name: new RegExp(launch.name),
      });
      expect(mission).toHaveTextContent('Site time');
      expect(mission).toHaveTextContent('Your time');
      const missionTimes = mission.querySelectorAll('time');
      expect(missionTimes).toHaveLength(4);
      expect(
        [...missionTimes].every(
          (time) => time.getAttribute('datetime') === launch.date,
        ),
      ).toBe(true);
      expect(mission.querySelector('.launch-card-date')).toContainElement(
        missionTimes[0],
      );
      expect(mission.querySelector('.launch-site-time')).toContainElement(
        missionTimes[2],
      );
      expect(mission.querySelector('.local-launch-time')).toContainElement(
        missionTimes[3],
      );
    }
  });

  it('makes the bounded upcoming feed window visible before filtering', async () => {
    const user = userEvent.setup();
    vi.mocked(useLaunches).mockReturnValue({
      launches: [...UPCOMING_LAUNCHES].reverse(),
      online: true,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    const coverage = screen.getByLabelText(
      'Upcoming feed coverage: Jul 28, 2035 through Aug 2, 2035'
    );
    expect(coverage).toHaveTextContent('Feed window');
    expect(coverage).toHaveTextContent('Jul 28, 2035');
    expect(coverage).toHaveTextContent('Aug 2, 2035');
    expect(coverage.querySelectorAll('time')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search launches' }),
      'Polaris',
    );

    expect(
      screen.getByLabelText(
        'Upcoming feed coverage: Jul 28, 2035 through Aug 2, 2035'
      )
    ).toBeVisible();
    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' })
    ).toHaveTextContent('1 mission');
  });

  it('finds missions by profile and orbit metadata', async () => {
    const user = userEvent.setup();

    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      online: true,
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
      online: true,
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

  it('preserves provider TBD and TBC timing semantics in compact rows', () => {
    vi.mocked(useLaunches).mockReturnValue({
      launches: [
        {
          ...UPCOMING_LAUNCHES[0],
          id: 'll2-timing-determined',
          sourceId: 'timing-determined',
          name: 'Determined Window',
          status: 'tbd',
          statusName: 'To Be Determined',
        },
        {
          ...UPCOMING_LAUNCHES[1],
          id: 'spacex-timing-confirmed',
          sourceId: 'timing-confirmed',
          name: 'Confirmed Window',
          status: 'tbd',
          statusName: 'To Be Confirmed',
        },
      ],
      online: true,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    const determined = screen.getByRole('link', {
      name: /Determined Window/,
    });
    const confirmed = screen.getByRole('link', {
      name: /Confirmed Window/,
    });
    expect(determined).toHaveTextContent('TBD');
    expect(determined).toHaveAccessibleName(/To be determined/);
    expect(confirmed).toHaveTextContent('TBC');
    expect(confirmed).toHaveAccessibleName(/To be confirmed/);
  });

  it('preserves an actionable provider alert in compact rows', () => {
    vi.mocked(useLaunches).mockReturnValue({
      launches: [
        {
          ...UPCOMING_LAUNCHES[0],
          status: 'tbd',
          statusName: 'On Hold',
        },
      ],
      online: true,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    const mission = screen.getByRole('link', { name: /Orbital Dawn/ });
    expect(mission).toHaveTextContent('On Hold');
    expect(mission).not.toHaveTextContent('TBD');
  });

  it('reconciles filters when history navigation changes the URL context', () => {
    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      online: true,
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
      online: true,
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

    await user.keyboard('{Tab}');
    expect(
      screen.getByRole('link', { name: /Schedule Mission 6/ })
    ).toHaveFocus();

    loadMore.focus();

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
      online: true,
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

  it('keeps retained missions available without offering an offline retry', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useLaunches).mockReturnValue({
      launches: UPCOMING_LAUNCHES,
      online: false,
      loading: false,
      refreshing: false,
      error: null,
      meta: FEED_META,
      refresh,
    });

    render(<LaunchList />);

    expect(screen.getByText('Device is offline.')).toBeVisible();
    expect(
      screen.getByRole('status', { name: 'Upcoming launch results' }),
    ).toHaveTextContent('device offline; showing last-known schedule');
    const refreshWhenOnline = screen.getByRole('button', {
      name: 'Refresh when online',
    });
    expect(refreshWhenOnline).toHaveAttribute('aria-disabled', 'true');
    await user.click(refreshWhenOnline);
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByText('Orbital Dawn')).toBeVisible();
  });

  it('suppresses live claims for missions from a stale provider cache', () => {
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'In Flight',
      isLive: true,
      webcastLive: true,
    };
    vi.mocked(useLaunches).mockReturnValue({
      launches: [liveLaunch],
      online: true,
      loading: false,
      refreshing: false,
      error: null,
      meta: { ...FEED_META, stale: true },
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    render(<LaunchList />);

    const missionRow = screen.getByText('Orbital Dawn').closest('.mission-row');
    expect(missionRow).toHaveStyle('--row-signal: var(--console-amber)');
    expect(screen.getByText('Coverage unconfirmed').parentElement).toHaveClass(
      'text-[var(--console-amber)]'
    );
    expect(screen.queryByText('Live now')).not.toBeInTheDocument();
    expect(missionRow?.querySelector('.status-dot-live')).not.toBeInTheDocument();
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
      online: true,
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
