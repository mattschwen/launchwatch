import { render, screen } from '@testing-library/react';
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
    ).toHaveAttribute('href', '/launch/spacex-demo-return');
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

  it('offers a retry after an upstream archive error', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Provider maintenance' }),
      })
      .mockResolvedValueOnce(successfulResponse);
    vi.stubGlobal('fetch', fetchMock);

    render(<PastLaunches />);

    expect(
      await screen.findByText('The archive could not be synchronized.')
    ).toBeVisible();
    expect(screen.getByText('Provider maintenance')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry archive' }));

    expect(await screen.findByText('Demo Return Flight')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
