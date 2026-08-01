import { render, screen, waitFor } from '@testing-library/react';
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

    await user.click(toggle);

    expect(toggle).toHaveAccessibleName('Hide archive filters');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(controlledId!)).toHaveClass('contents');
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveValue(
      'all'
    );
  });

  it('preserves active archive filters in mission detail links', async () => {
    render(
      <PastLaunches
        initialFilters={{
          search: 'Return',
          provider: 'SpaceX',
          year: '2025',
          outcome: 'success',
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
      screen.getByRole('button', { name: 'Hide archive filters' })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'View mission' })).toHaveAttribute(
      'href',
      '/launch/spacex-demo-return?from=history&history=q%3DReturn%26provider%3DSpaceX%26year%3D2025%26outcome%3Dsuccess',
    );
  });

  it('announces filtered results and clears all archive filters at once', async () => {
    const user = userEvent.setup();
    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    const search = screen.getByRole('searchbox', { name: 'Search missions' });
    const clear = screen.getByRole('button', {
      name: 'Clear archive filters',
    });

    expect(clear).toBeDisabled();
    await user.type(search, 'no matching mission');

    expect(screen.getByRole('status')).toHaveTextContent('0 results');
    expect(clear).toBeEnabled();

    clear.focus();
    await user.keyboard('{Enter}');

    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('2 results');
    expect(screen.getByText('Demo Return Flight')).toBeVisible();
    expect(screen.getByText('Pathfinder Qualification')).toBeVisible();
    expect(clear).toBeDisabled();
  });

  it('treats whitespace-only search input as an inactive filter', async () => {
    const user = userEvent.setup();
    render(<PastLaunches />);

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    const search = screen.getByRole('searchbox', { name: 'Search missions' });
    const clear = screen.getByRole('button', {
      name: 'Clear archive filters',
    });

    await user.type(search, '   ');

    expect(screen.getByRole('status')).toHaveTextContent('2 results');
    expect(clear).toBeDisabled();
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

  it('announces pagination progress and preserves focus after the final batch', async () => {
    const user = userEvent.setup();
    const launches = Array.from({ length: 41 }, (_, index) => {
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
      await screen.findByText('Showing 20 of 41 results')
    ).toBeVisible();
    const loadMore = screen.getByRole('button', { name: 'Load 20 more' });

    loadMore.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 40 of 41 results'
    );
    expect(loadMore).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('41 results');
    expect(loadMore).toHaveAccessibleName('All 41 missions loaded');
    expect(loadMore).toHaveAttribute('aria-disabled', 'true');
    expect(loadMore).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('article')).toHaveLength(41);
    expect(loadMore).toHaveFocus();
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
