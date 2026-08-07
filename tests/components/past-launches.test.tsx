import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PastLaunches from '@/components/PastLaunches';
import { FEED_META, HISTORICAL_LAUNCHES } from '../fixtures/launches';

const successfulResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    launches: HISTORICAL_LAUNCHES,
    meta: FEED_META,
  }),
};

describe('PastLaunches', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successfulResponse));
  });

  it('explains archive synchronization while results are loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    render(<PastLaunches />);

    const loadingRegion = screen.getByRole('region', {
      name: 'Synchronizing launch archive',
    });
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
    expect(loadingRegion).toHaveAccessibleDescription(
      'Retrieving completed missions from connected providers.'
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Synchronizing launch archive',
      })
    ).toBeVisible();
    expect(screen.getByText('Acquiring records')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    const skeletons = [...loadingRegion.querySelectorAll('.skeleton')];
    expect(skeletons.length).toBeGreaterThan(0);
    expect(
      skeletons.every((skeleton) => skeleton.closest('[aria-hidden="true"]'))
    ).toBe(true);
  });

  it('loads, filters, and expands deterministic archive results', async () => {
    const user = userEvent.setup();
    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    expect(screen.getByText('Pathfinder Qualification')).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'View mission Demo Return Flight',
      })
    ).toHaveAttribute(
      'href',
      '/launch/spacex-demo-return?from=history',
    );
    expect(
      screen.getByRole('link', {
        name: 'View mission Pathfinder Qualification',
      })
    ).toBeVisible();

    await user.type(screen.getByRole('searchbox', { name: 'Search missions' }), 'Return');

    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(screen.queryByText('Pathfinder Qualification')).not.toBeInTheDocument();
    expect(screen.getByText('1 result')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Demo Return Flight/i }));

    expect(
      screen.getByText(/completed crew demonstration mission/i)
    ).toBeVisible();
    expect(
      screen.getAllByRole('link', { name: /View mission/i })[0]
    ).toHaveAttribute(
      'href',
      '/launch/spacex-demo-return?from=history&history=q%3DReturn',
    );
  });

  it('marks and filters past missions whose outcomes remain unconfirmed', async () => {
    const user = userEvent.setup();
    const unconfirmedLaunch = {
      ...HISTORICAL_LAUNCHES[0],
      id: 'll2-demo-outcome-pending',
      sourceId: 'demo-outcome-pending',
      source: 'll2' as const,
      ll2Id: 'demo-outcome-pending',
      name: 'Past Window Mission',
      status: 'upcoming' as const,
      statusName: 'Go for Launch',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          launches: [HISTORICAL_LAUNCHES[0], unconfirmedLaunch],
          meta: FEED_META,
        }),
      }),
    );

    render(<PastLaunches />);

    const pendingRow = (await screen.findByText('Past Window Mission')).closest(
      'article',
    );
    expect(pendingRow).not.toBeNull();
    expect(pendingRow).toHaveTextContent('Outcome unconfirmed');
    expect(pendingRow).not.toHaveTextContent('Go for Launch');
    expect(
      pendingRow?.querySelectorAll('[data-history-outcome="upcoming"]'),
    ).toHaveLength(2);
    expect(
      [...(pendingRow?.querySelectorAll('[data-history-outcome="upcoming"]') ?? [])]
        .every((element) => element.classList.contains('text-[var(--console-amber)]')),
    ).toBe(true);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Outcome' }),
      'pending',
    );

    expect(screen.getByText('Past Window Mission')).toBeVisible();
    expect(screen.queryByText('Demo Return Flight')).not.toBeInTheDocument();
    expect(window.location.search).toBe('?outcome=pending');
  });

  it('checks canonical mission details for replay coverage on demand', async () => {
    const user = userEvent.setup();
    const summaryLaunches = HISTORICAL_LAUNCHES.map((launch, index) =>
      index === 0
        ? { ...launch, livestream: null, livestreams: null }
        : launch
    );
    let releaseDetail: (() => void) | undefined;
    const detailGate = new Promise<void>((resolve) => {
      releaseDetail = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('type=history')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ launches: summaryLaunches, meta: FEED_META }),
        } as Response;
      }

      await detailGate;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          launch: HISTORICAL_LAUNCHES[0],
          canonicalId: HISTORICAL_LAUNCHES[0].id,
          meta: FEED_META,
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('link', { name: 'Watch replay' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Demo Return Flight/i }));

    expect(
      screen.getByRole('status', { name: 'Checking replay coverage' })
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    releaseDetail?.();

    expect(
      await screen.findByRole('link', { name: 'Watch replay' })
    ).toHaveAttribute('href', '/watch?id=spacex-demo-return');
  });

  it('retries a failed replay check without losing keyboard focus', async () => {
    const user = userEvent.setup();
    const summaryLaunches = HISTORICAL_LAUNCHES.map((launch, index) =>
      index === 0
        ? { ...launch, livestream: null, livestreams: null }
        : launch
    );
    let detailRequests = 0;
    let releaseRetry: (() => void) | undefined;
    const retryGate = new Promise<void>((resolve) => {
      releaseRetry = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('type=history')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ launches: summaryLaunches, meta: FEED_META }),
          } as Response;
        }

        detailRequests += 1;
        if (detailRequests === 1) {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: 'Replay provider maintenance' }),
          } as Response;
        }

        await retryGate;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            launch: HISTORICAL_LAUNCHES[0],
            canonicalId: HISTORICAL_LAUNCHES[0].id,
            meta: FEED_META,
          }),
        } as Response;
      })
    );

    render(<PastLaunches />);
    await screen.findByText('Demo Return Flight');
    await user.click(screen.getByRole('button', { name: /Demo Return Flight/i }));

    const retry = await screen.findByRole('button', {
      name: 'Retry replay check',
    });
    expect(
      screen.getByRole('status', { name: 'Replay check failed' })
    ).toHaveTextContent(
      'Replay check failed. Replay provider maintenance'
    );
    retry.focus();
    await user.keyboard('{Enter}');

    const checking = screen.getByRole('button', {
      name: 'Checking replay coverage',
    });
    await waitFor(() => expect(checking).toHaveFocus());
    expect(checking).toHaveAttribute('aria-disabled', 'true');
    expect(checking).toHaveAttribute('aria-busy', 'true');
    expect(detailRequests).toBe(2);

    releaseRetry?.();

    const replay = await screen.findByRole('link', { name: 'Watch replay' });
    await waitFor(() => expect(replay).toHaveFocus());
  });

  it('keeps retry focus when replay verification fails again', async () => {
    const user = userEvent.setup();
    const summaryLaunches = HISTORICAL_LAUNCHES.map((launch, index) =>
      index === 0
        ? { ...launch, livestream: null, livestreams: null }
        : launch
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('type=history')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ launches: summaryLaunches, meta: FEED_META }),
          } as Response;
        }

        return {
          ok: false,
          status: 503,
          json: async () => ({ error: 'Replay provider maintenance' }),
        } as Response;
      })
    );

    render(<PastLaunches />);
    await screen.findByText('Demo Return Flight');
    await user.click(screen.getByRole('button', { name: /Demo Return Flight/i }));

    const retry = await screen.findByRole('button', {
      name: 'Retry replay check',
    });
    retry.focus();
    await user.keyboard('{Enter}');

    const restoredRetry = await screen.findByRole('button', {
      name: 'Retry replay check',
    });
    await waitFor(() => expect(restoredRetry).toHaveFocus());
    expect(
      screen.getByRole('status', { name: 'Replay check failed' })
    ).toBeVisible();
  });

  it('makes the bounded archive feed window visible before filtering', async () => {
    const launches = Array.from({ length: 100 }, (_, index) => {
      const launch = HISTORICAL_LAUNCHES[index % HISTORICAL_LAUNCHES.length];
      return {
        ...launch,
        id: `${launch.id}-archive-window-${index}`,
        sourceId: `${launch.sourceId}-archive-window-${index}`,
      };
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ launches, meta: FEED_META }),
      })
    );

    render(<PastLaunches />);

    const coverage = await screen.findByLabelText(
      /Archive feed coverage: latest 100 missions/
    );
    expect(coverage).toHaveTextContent('Latest 100 missions');
    expect(coverage).toHaveTextContent('Nov 5, 2024');
    expect(coverage).toHaveTextContent('Apr 14, 2025');
    expect(coverage.querySelectorAll('time')).toHaveLength(2);
  });

  it('finds archived missions by briefing and orbit metadata', async () => {
    const user = userEvent.setup();
    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    await user.type(
      screen.getByRole('searchbox', { name: 'Search missions' }),
      'crew demonstration low earth',
    );

    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(
      screen.queryByText('Pathfinder Qualification'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Archive results' }),
    ).toHaveTextContent('1 result');
  });

  it('discloses secondary archive filters while keeping search primary', async () => {
    const user = userEvent.setup();
    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    const toggle = screen.getByRole('button', {
      name: 'Show archive filters',
    });
    const controlledId = toggle.getAttribute('aria-controls');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(controlledId).toBeTruthy();
    expect(document.getElementById(controlledId!)).toHaveClass('hidden');
    expect(screen.getByText('Search missions')).toBeVisible();

    await user.click(toggle);

    expect(toggle).toHaveAccessibleName('Hide archive filters');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(controlledId!)).toHaveClass('contents');
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveValue(
      'all'
    );
    expect(
      (screen.getByRole('combobox', {
        name: 'Provider',
      }) as HTMLSelectElement).labels?.[0]
    ).toBeVisible();
    expect(
      (screen.getByRole('combobox', {
        name: 'Launch year',
      }) as HTMLSelectElement).labels?.[0]
    ).toBeVisible();
    expect(
      (screen.getByRole('combobox', {
        name: 'Outcome',
      }) as HTMLSelectElement).labels?.[0]
    ).toBeVisible();
  });

  it('preserves active archive filters in mission detail links', async () => {
    render(
      <PastLaunches
        initialFilters={{
          search: 'Return',
          provider: 'SpaceX',
          year: '2025',
          outcome: 'success',
          sortBy: 'date-desc',
        }}
      />,
    );

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    expect(
      screen.queryByText('Pathfinder Qualification'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search missions' }),
    ).toHaveValue('Return');
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveValue(
      'SpaceX',
    );
    expect(
      screen.getByRole('button', {
        name: 'Hide archive filters, 3 active',
      })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', {
      name: 'View mission Demo Return Flight',
    })).toHaveAttribute(
      'href',
      '/launch/spacex-demo-return?from=history&history=q%3DReturn%26provider%3DSpaceX%26year%3D2025%26outcome%3Dsuccess',
    );
  });

  it('keeps an unavailable archive provider visible as the selected filter', async () => {
    render(
      <PastLaunches
        initialFilters={{
          search: '',
          provider: 'Retired Provider',
          year: 'all',
          outcome: 'all',
          sortBy: 'date-desc',
        }}
      />
    );

    expect(
      await screen.findByRole('heading', {
        name: 'No archived missions match these filters.',
      })
    ).toBeVisible();
    const provider = screen.getByRole('combobox', { name: 'Provider' });
    expect(provider).toHaveValue('Retired Provider');
    expect(
      screen.getByRole('option', {
        name: 'Retired Provider — not in current feed',
      })
    ).toBeInTheDocument();
  });

  it('keeps an unavailable archive year visible as the selected filter', async () => {
    render(
      <PastLaunches
        initialFilters={{
          search: '',
          provider: 'all',
          year: '1999',
          outcome: 'all',
          sortBy: 'date-desc',
        }}
      />
    );

    expect(
      await screen.findByRole('status', { name: 'Archive results' })
    ).toHaveTextContent('0 results');
    const year = screen.getByRole('combobox', { name: 'Launch year' });
    expect(year).toHaveValue('1999');
    expect(
      screen.getByRole('option', {
        name: '1999 — not in current feed',
      })
    ).toBeInTheDocument();
  });

  it('announces filtered results and clears all archive filters at once', async () => {
    const user = userEvent.setup();
    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    const search = screen.getByRole('searchbox', { name: 'Search missions' });

    expect(
      screen.queryByRole('button', { name: 'Clear archive filters' })
    ).not.toBeInTheDocument();
    await user.type(search, 'no matching mission');

    expect(screen.getByRole('status')).toHaveTextContent('0 results');
    const clear = screen.getByRole('button', {
      name: 'Clear archive filters',
    });
    expect(clear).toBeEnabled();
    expect(clear).toHaveTextContent('Clear filters');

    clear.focus();
    await user.keyboard('{Enter}');

    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('2 results');
    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(screen.getByText('Pathfinder Qualification')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Clear archive filters' })
    ).not.toBeInTheDocument();
  });

  it('treats whitespace-only search input as an inactive filter', async () => {
    const user = userEvent.setup();
    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    const search = screen.getByRole('searchbox', { name: 'Search missions' });

    await user.type(search, '   ');

    expect(screen.getByRole('status')).toHaveTextContent('2 results');
    expect(
      screen.queryByRole('button', { name: 'Clear archive filters' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(screen.getByText('Pathfinder Qualification')).toBeVisible();
  });

  it('distinguishes an empty provider archive and offers recovery', async () => {
    const user = userEvent.setup();
    const emptyResponse = {
      ok: true,
      status: 200,
      json: async () => ({ launches: [], meta: FEED_META }),
    };
    let resolveRetry: ((response: typeof emptyResponse) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse)
      .mockImplementationOnce(
        () =>
          new Promise<typeof emptyResponse>((resolve) => {
            resolveRetry = resolve;
          })
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);

    expect(
      await screen.findByRole('heading', {
        name: 'No archived missions are available.',
      })
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'No archived missions match these filters.',
      })
    ).not.toBeInTheDocument();

    const refresh = screen.getByRole('button', {
      name: 'Refresh launch archive',
    });
    await user.click(refresh);

    expect(refresh).toHaveAccessibleName('Refreshing launch archive');
    expect(refresh).toHaveAttribute('aria-disabled', 'true');
    expect(refresh).toHaveAttribute('aria-busy', 'true');
    resolveRetry?.(emptyResponse);

    expect(
      await screen.findByRole('button', { name: 'Refresh launch archive' })
    ).toBeVisible();
    await waitFor(() => {
      expect(
        screen.getByRole('searchbox', { name: 'Search missions' })
      ).toHaveFocus();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports an incomplete initial response instead of a false empty archive', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ meta: FEED_META }),
      })
    );

    render(<PastLaunches />);

    expect(
      await screen.findByRole('heading', {
        name: 'The archive could not be synchronized.',
      })
    ).toBeVisible();
    expect(
      screen.getByText('Launch archive response was incomplete')
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'No archived missions are available.',
      })
    ).not.toBeInTheDocument();
  });

  it('rejects noncanonical archive records instead of emitting invalid mission links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          launches: [
            {
              ...HISTORICAL_LAUNCHES[0],
              id: 'demo-return',
              sourceId: 'demo-return',
            },
          ],
          meta: FEED_META,
        }),
      })
    );

    render(<PastLaunches />);

    expect(
      await screen.findByRole('heading', {
        name: 'The archive could not be synchronized.',
      })
    ).toBeVisible();
    expect(
      screen.getByText('Launch archive response was incomplete')
    ).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /^View mission / })
    ).not.toBeInTheDocument();
  });

  it('announces pagination progress and preserves focus after the final batch', async () => {
    const user = userEvent.setup();
    const launches = Array.from({ length: 21 }, (_, index) => {
      const launch = HISTORICAL_LAUNCHES[index % HISTORICAL_LAUNCHES.length];
      return {
        ...launch,
        id: `${launch.id}-${index}`,
        sourceId: `${launch.sourceId}-${index}`,
        name: `Archive Mission ${index + 1}`,
      };
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ launches, meta: FEED_META }),
      })
    );

    render(<PastLaunches />);

    expect(
      await screen.findByText('Showing 10 of 21 results')
    ).toBeVisible();
    const loadMore = screen.getByRole('button', { name: 'Load 10 more' });

    loadMore.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 20 of 21 results'
    );
    expect(loadMore).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('21 results');
    expect(loadMore).toHaveAccessibleName('All 21 missions loaded');
    expect(loadMore).toHaveAttribute('aria-disabled', 'true');
    expect(loadMore).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('article')).toHaveLength(21);
    expect(loadMore).toHaveFocus();
  });

  it('refreshes settled records and reports a retained archive after failure', async () => {
    const user = userEvent.setup();
    type MockResponse = {
      ok: boolean;
      status: number;
      json: () => Promise<unknown>;
    };
    let resolveRefresh: ((response: MockResponse) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successfulResponse)
      .mockImplementationOnce(
        () =>
          new Promise<MockResponse>((resolve) => {
            resolveRefresh = resolve;
          })
      )
      .mockResolvedValueOnce(successfulResponse);
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    const refresh = screen.getByRole('button', { name: 'Refresh archive' });
    refresh.focus();
    await user.keyboard('{Enter}');

    expect(refresh).toHaveAccessibleName('Refreshing archive');
    expect(refresh).toHaveAttribute('aria-disabled', 'true');
    expect(refresh).toHaveAttribute('aria-busy', 'true');
    expect(refresh).toHaveFocus();
    expect(
      screen.getByRole('region', { name: 'Archived launch results' })
    ).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Demo Return Flight')).toBeVisible();

    resolveRefresh?.({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Provider maintenance' }),
    });

    expect(
      await screen.findByText('Archive refresh failed.', { exact: false })
    ).toBeVisible();
    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(refresh).toHaveAccessibleName('Refresh archive');
    expect(refresh).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(
        screen.queryByText('Archive refresh failed.', { exact: false })
      ).not.toBeInTheDocument();
    });
    expect(refresh).toHaveAccessibleName('Refresh archive');
    expect(refresh).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retains archive results offline and refreshes them after reconnecting', async () => {
    const user = userEvent.setup();
    let online = true;
    const onlineSpy = vi
      .spyOn(window.navigator, 'onLine', 'get')
      .mockImplementation(() => online);
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse);
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);
    expect(await screen.findByText('Demo Return Flight')).toBeVisible();

    online = false;
    fireEvent(window, new Event('offline'));

    expect(screen.getByText('Device is offline.')).toBeVisible();
    const refresh = screen.getByRole('button', {
      name: 'Refresh when online',
    });
    expect(refresh).toHaveAttribute('aria-disabled', 'true');
    await user.click(refresh);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByText('Demo Return Flight')).toBeVisible();

    online = true;
    fireEvent(window, new Event('online'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Refresh archive' }),
      ).toHaveAttribute('aria-disabled', 'false'),
    );
    onlineSpy.mockRestore();
  });

  it('retains settled records when a successful refresh omits its launch collection', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successfulResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ meta: FEED_META }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Refresh archive' }));

    expect(
      await screen.findByText('Archive refresh failed.', { exact: false })
    ).toBeVisible();
    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'No archived missions are available.',
      })
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retains settled records when a successful refresh contains an invalid launch collection', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successfulResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          launches: [
            {
              ...HISTORICAL_LAUNCHES[0],
              id: 'demo-return',
              sourceId: 'demo-return',
            },
          ],
          meta: FEED_META,
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Refresh archive' }));

    expect(
      await screen.findByText('Archive refresh failed.', { exact: false })
    ).toBeVisible();
    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View mission Demo Return Flight' })
    ).toHaveAttribute('href', '/launch/spacex-demo-return?from=history');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps partial provider guidance on the single archive refresh command', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          launches: HISTORICAL_LAUNCHES,
          meta: { ...FEED_META, partial: true },
        }),
      })
    );

    render(<PastLaunches />);

    expect(
      await screen.findByText(
        'Some archive results may be delayed while a provider recovers. Use Refresh archive to check for recovered records.'
      )
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Refresh archive' })
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument();
  });

  it('offers a retry after an upstream archive error', async () => {
    const user = userEvent.setup();
    let resolveRetry: ((response: typeof successfulResponse) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Provider maintenance' }),
      })
      .mockImplementationOnce(
        () =>
          new Promise<typeof successfulResponse>((resolve) => {
            resolveRetry = resolve;
          })
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);

    expect(
      await screen.findByText('The archive could not be synchronized.')
    ).toBeVisible();
    expect(screen.getByText('Provider maintenance')).toBeVisible();

    const retry = screen.getByRole('button', { name: 'Retry archive' });
    retry.focus();
    await user.keyboard('{Enter}');

    expect(retry).toHaveAccessibleName('Retrying archive');
    expect(retry).toHaveAttribute('aria-disabled', 'true');
    expect(retry).toHaveAttribute('aria-busy', 'true');
    expect(retry).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveRetry?.(successfulResponse);
    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    await waitFor(() => {
      expect(
        screen.getByRole('searchbox', { name: 'Search missions' })
      ).toHaveFocus();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
