import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LaunchDataProvider } from '@/lib/contexts';
import { useLaunchById, useLaunches } from '@/lib/hooks';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function HookHarness({
  initialId,
}: {
  initialId: string;
}): React.ReactElement {
  const [id, setId] = useState(initialId);
  const result = useLaunchById(id);

  return (
    <>
      <button type="button" onClick={() => setId(UPCOMING_LAUNCHES[1].id)}>
        Select second
      </button>
      <p data-testid="selected-name">{result.launch?.name ?? 'Loading'}</p>
      <p data-testid="selected-stream">
        {result.launch?.livestream ?? 'No stream'}
      </p>
      <p data-testid="enrichment-state">
        {result.enriching ? 'Acquiring detail' : 'Detail settled'}
      </p>
    </>
  );
}

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function FeedRetryHarness(): React.ReactElement {
  const { launches, loading, refreshing, error, refresh } = useLaunches();

  return (
    <>
      <button type="button" onClick={() => void refresh()}>
        Retry
      </button>
      <p data-testid="feed-state">
        {loading
          ? 'loading'
          : refreshing
            ? 'retrying'
            : error
              ? error
              : `${launches.length} launches`}
      </p>
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLaunchById', () => {
  it('replaces list data with canonical detail data without hiding the feed fallback', async () => {
    let resolveDetail: ((value: Response) => void) | undefined;
    const detailResponse = new Promise<Response>((resolve) => {
      resolveDetail = resolve;
    });
    const detailedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      livestream: 'https://x.com/i/broadcasts/orbital-dawn',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('?type=all')) {
          return Promise.resolve(response({ launches: UPCOMING_LAUNCHES }));
        }
        return detailResponse;
      })
    );

    render(
      <LaunchDataProvider>
        <HookHarness initialId={UPCOMING_LAUNCHES[0].id} />
      </LaunchDataProvider>
    );

    await expect(
      screen.findByText(UPCOMING_LAUNCHES[0].name)
    ).resolves.toBeVisible();
    expect(screen.getByTestId('selected-stream')).toHaveTextContent('No stream');
    expect(screen.getByTestId('enrichment-state')).toHaveTextContent(
      'Acquiring detail'
    );

    resolveDetail?.(response({ launch: detailedLaunch }));

    await waitFor(() =>
      expect(screen.getByTestId('selected-stream')).toHaveTextContent(
        detailedLaunch.livestream
      )
    );
    expect(screen.getByTestId('enrichment-state')).toHaveTextContent(
      'Detail settled'
    );
  });

  it('never shows the prior detailed mission after the selected ID changes', async () => {
    const user = userEvent.setup();
    const detailedFirst = {
      ...UPCOMING_LAUNCHES[0],
      name: 'Detailed Orbital Dawn',
    };
    const detailedSecond = {
      ...UPCOMING_LAUNCHES[1],
      name: 'Detailed Polaris Relay',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('?type=all')) {
          return Promise.resolve(response({ launches: UPCOMING_LAUNCHES }));
        }
        if (url.endsWith(UPCOMING_LAUNCHES[0].id)) {
          return Promise.resolve(response({ launch: detailedFirst }));
        }
        return Promise.resolve(response({ launch: detailedSecond }));
      })
    );

    render(
      <LaunchDataProvider>
        <HookHarness initialId={UPCOMING_LAUNCHES[0].id} />
      </LaunchDataProvider>
    );

    await expect(
      screen.findByText(detailedFirst.name)
    ).resolves.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Select second' }));

    expect(screen.getByTestId('selected-name')).not.toHaveTextContent(
      detailedFirst.name
    );
    await expect(
      screen.findByText(detailedSecond.name)
    ).resolves.toBeVisible();
  });
});

describe('LaunchDataProvider retries', () => {
  it('reports a retry after the initial request fails and suppresses duplicates', async () => {
    const user = userEvent.setup();
    let resolveRetry: ((value: Response) => void) | undefined;
    const retryResponse = new Promise<Response>((resolve) => {
      resolveRetry = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Provider maintenance' }),
      } as Response)
      .mockImplementationOnce(() => retryResponse);
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await expect(
      screen.findByText('Provider maintenance')
    ).resolves.toBeVisible();

    const retry = screen.getByRole('button', { name: 'Retry' });
    await user.click(retry);
    expect(screen.getByTestId('feed-state')).toHaveTextContent('retrying');
    await user.click(retry);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveRetry?.(response({ launches: UPCOMING_LAUNCHES }));
    await waitFor(() =>
      expect(screen.getByTestId('feed-state')).toHaveTextContent('2 launches')
    );
  });
});
