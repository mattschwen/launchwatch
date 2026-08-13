import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LaunchDataProvider, useLiveContext } from '@/lib/contexts';
import {
  useCurrentTime,
  useLaunchById,
  useLaunchIntel,
  useLaunches,
} from '@/lib/hooks';
import {
  FEED_META,
  LAUNCH_INTEL,
  UPCOMING_LAUNCHES,
} from '../fixtures/launches';

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
      <button type="button" onClick={result.retry}>
        Retry detail
      </button>
      <p data-testid="selected-name">{result.launch?.name ?? 'Loading'}</p>
      <p data-testid="selected-stream">
        {result.launch?.livestream ?? 'No stream'}
      </p>
      <p data-testid="selected-date">{result.launch?.date ?? 'No date'}</p>
      <p data-testid="selected-status">
        {result.launch
          ? `${result.launch.status}:${String(result.launch.isLive)}`
          : 'No status'}
      </p>
      <p data-testid="enrichment-state">
        {result.enriching ? 'Acquiring detail' : 'Detail settled'}
      </p>
      <p data-testid="selected-error">{result.error ?? 'No error'}</p>
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
  const { launches, online, loading, refreshing, error, refresh } = useLaunches();
  const { liveCount } = useLiveContext();

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
      <p data-testid="feed-count">{launches.length}</p>
      <p data-testid="live-count">{liveCount}</p>
      <p data-testid="network-state">{online ? 'online' : 'offline'}</p>
    </>
  );
}

function IntelRetryHarness(): React.ReactElement {
  const { intel, loading, offline, error, retry } = useLaunchIntel(
    UPCOMING_LAUNCHES[0],
  );

  return (
    <>
      <button type="button" onClick={retry}>
        Retry intelligence
      </button>
      <p data-testid="intel-state">
        {loading
          ? error
            ? `retrying: ${error}`
            : 'loading'
          : error
            ? error
            : intel?.summary.rationale ?? 'empty'}
      </p>
      <p data-testid="intel-network-state">
        {offline ? 'offline' : 'online'}
      </p>
    </>
  );
}

function ClockHarness(): React.ReactElement {
  const now = useCurrentTime();
  return <time>{new Date(now).toISOString()}</time>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useLaunchById', () => {
  it('keeps the feed mission when a successful detail response is incomplete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('?type=all')) {
          return Promise.resolve(response({ launches: UPCOMING_LAUNCHES }));
        }
        return Promise.resolve(
          response({ launch: { id: UPCOMING_LAUNCHES[0].id } })
        );
      })
    );

    render(
      <LaunchDataProvider>
        <HookHarness initialId={UPCOMING_LAUNCHES[0].id} />
      </LaunchDataProvider>
    );

    await expect(
      screen.findByText('Mission response was incomplete')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('selected-name')).toHaveTextContent(
      UPCOMING_LAUNCHES[0].name
    );
    expect(screen.getByTestId('selected-stream')).toHaveTextContent('No stream');
  });

  it('keeps the requested mission when detail data returns another canonical ID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('?type=all')) {
          return Promise.resolve(response({ launches: UPCOMING_LAUNCHES }));
        }
        return Promise.resolve(response({ launch: UPCOMING_LAUNCHES[1] }));
      })
    );

    render(
      <LaunchDataProvider>
        <HookHarness initialId={UPCOMING_LAUNCHES[0].id} />
      </LaunchDataProvider>
    );

    await expect(
      screen.findByText('Mission response did not match the requested ID')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('selected-name')).toHaveTextContent(
      UPCOMING_LAUNCHES[0].name
    );
  });

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

  it('keeps current feed timing and status authoritative while adding detail enrichment', async () => {
    const feedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      date: '2035-08-03T12:30:00.000Z',
      dateUnix: 2069757000,
      status: 'upcoming' as const,
      statusName: 'Go for Launch',
      isLive: false,
      webcastLive: false,
    };
    const olderDetail = {
      ...UPCOMING_LAUNCHES[0],
      date: '2035-08-03T11:30:00.000Z',
      dateUnix: 2069753400,
      status: 'live' as const,
      statusName: 'In Flight',
      isLive: true,
      webcastLive: true,
      livestream: 'https://x.com/i/broadcasts/orbital-dawn',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('?type=all')) {
          return Promise.resolve(response({ launches: [feedLaunch] }));
        }
        return Promise.resolve(response({ launch: olderDetail }));
      })
    );

    render(
      <LaunchDataProvider>
        <HookHarness initialId={feedLaunch.id} />
      </LaunchDataProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-stream')).toHaveTextContent(
        olderDetail.livestream
      )
    );
    expect(screen.getByTestId('selected-date')).toHaveTextContent(
      feedLaunch.date
    );
    expect(screen.getByTestId('selected-status')).toHaveTextContent(
      'upcoming:false'
    );
  });

  it('keeps newly announced feed coverage after older detail enrichment settles', async () => {
    const announcedStream =
      'https://www.youtube.com/watch?v=orbital-dawn-announced';
    const feedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      livestream: announcedStream,
      livestreams: [
        {
          url: announcedStream,
          title: 'Official mission coverage',
          isLive: false,
        },
      ],
      videoThumbnail: 'https://example.test/orbital-dawn-announced.jpg',
    };
    const olderDetail = {
      ...UPCOMING_LAUNCHES[0],
      livestream: null,
      livestreams: null,
      videoThumbnail: null,
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('?type=all')) {
          return Promise.resolve(response({ launches: [feedLaunch] }));
        }
        return Promise.resolve(response({ launch: olderDetail }));
      }),
    );

    render(
      <LaunchDataProvider>
        <HookHarness initialId={feedLaunch.id} />
      </LaunchDataProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('enrichment-state')).toHaveTextContent(
        'Detail settled',
      ),
    );
    expect(screen.getByTestId('selected-stream')).toHaveTextContent(
      announcedStream,
    );
  });

  it('retains settled detail while the same mission revalidates after reconnecting', async () => {
    let online = true;
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(
      () => online,
    );
    let resolveRevalidation: ((value: Response) => void) | undefined;
    const revalidation = new Promise<Response>((resolve) => {
      resolveRevalidation = resolve;
    });
    const detailedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      livestream: 'https://x.com/i/broadcasts/orbital-dawn',
    };
    let detailRequests = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('?type=all')) {
          return Promise.resolve(response({ launches: UPCOMING_LAUNCHES }));
        }

        detailRequests += 1;
        return detailRequests === 1
          ? Promise.resolve(response({ launch: detailedLaunch }))
          : revalidation;
      }),
    );

    render(
      <LaunchDataProvider>
        <HookHarness initialId={detailedLaunch.id} />
      </LaunchDataProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-stream')).toHaveTextContent(
        detailedLaunch.livestream,
      ),
    );

    online = false;
    fireEvent(window, new Event('offline'));
    online = true;
    fireEvent(window, new Event('online'));

    await waitFor(() => expect(detailRequests).toBe(2));
    expect(screen.getByTestId('enrichment-state')).toHaveTextContent(
      'Acquiring detail',
    );
    expect(screen.getByTestId('selected-stream')).toHaveTextContent(
      detailedLaunch.livestream,
    );

    resolveRevalidation?.(response({ launch: detailedLaunch }));
    await waitFor(() =>
      expect(screen.getByTestId('enrichment-state')).toHaveTextContent(
        'Detail settled',
      ),
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

  it('retries failed detail enrichment without discarding the feed mission', async () => {
    const user = userEvent.setup();
    let resolveRetry: ((value: Response) => void) | undefined;
    const retryResponse = new Promise<Response>((resolve) => {
      resolveRetry = resolve;
    });
    const detailedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      livestream: 'https://x.com/i/broadcasts/orbital-dawn-recovered',
    };
    let detailRequests = 0;
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('?type=all')) {
        return Promise.resolve(response({ launches: UPCOMING_LAUNCHES }));
      }

      detailRequests += 1;
      if (detailRequests === 1) {
        return Promise.resolve({
          ok: false,
          status: 503,
          json: async () => ({ error: 'Detailed provider data unavailable' }),
        } as Response);
      }
      return retryResponse;
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <HookHarness initialId={UPCOMING_LAUNCHES[0].id} />
      </LaunchDataProvider>
    );

    await expect(
      screen.findByText('Detailed provider data unavailable')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('selected-name')).toHaveTextContent(
      UPCOMING_LAUNCHES[0].name
    );

    await user.click(screen.getByRole('button', { name: 'Retry detail' }));
    expect(screen.getByTestId('enrichment-state')).toHaveTextContent(
      'Acquiring detail'
    );
    await user.click(screen.getByRole('button', { name: 'Retry detail' }));
    expect(detailRequests).toBe(2);

    resolveRetry?.(response({ launch: detailedLaunch }));
    await waitFor(() =>
      expect(screen.getByTestId('selected-stream')).toHaveTextContent(
        detailedLaunch.livestream
      )
    );
    expect(detailRequests).toBe(2);
  });
});

describe('LaunchDataProvider retries', () => {
  it('immediately suppresses live claims and requests while offline', async () => {
    const user = userEvent.setup();
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'Live',
      isLive: true,
      webcastLive: true,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      response({ launches: [liveLaunch] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('live-count')).toHaveTextContent('1'),
    );
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    fireEvent(window, new Event('offline'));

    expect(screen.getByTestId('network-state')).toHaveTextContent('offline');
    expect(screen.getByTestId('live-count')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('stops claiming retained live state after a refresh failure', async () => {
    const user = userEvent.setup();
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'Live',
      isLive: true,
      webcastLive: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ launches: [liveLaunch] }))
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Provider maintenance' }),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('live-count')).toHaveTextContent('1')
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await expect(
      screen.findByText('Provider maintenance')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('feed-count')).toHaveTextContent('1');
    expect(screen.getByTestId('live-count')).toHaveTextContent('0');
  });

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

  it('retains settled missions when a successful response omits its launch collection', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ launches: UPCOMING_LAUNCHES }))
      .mockResolvedValueOnce(
        response({ meta: { generatedAt: '2035-07-26T12:00:00.000Z' } })
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await expect(screen.findByText('2 launches')).resolves.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await expect(
      screen.findByText('Launch feed response was incomplete')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('feed-count')).toHaveTextContent('2');
  });

  it('retains settled missions when a successful response has malformed provider metadata', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ launches: UPCOMING_LAUNCHES, meta: FEED_META })
      )
      .mockResolvedValueOnce(
        response({
          launches: [UPCOMING_LAUNCHES[1]],
          meta: { ...FEED_META, generatedAt: 'recently' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await expect(screen.findByText('2 launches')).resolves.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await expect(
      screen.findByText('Launch feed response was incomplete')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('feed-count')).toHaveTextContent('2');
  });

  it('rejects noncanonical launch identities without erasing settled missions', async () => {
    const user = userEvent.setup();
    const malformedLaunches = [
      {
        ...UPCOMING_LAUNCHES[0],
        id: 'demo-orbital-dawn',
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ launches: UPCOMING_LAUNCHES }))
      .mockResolvedValueOnce(response({ launches: malformedLaunches }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await expect(screen.findByText('2 launches')).resolves.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await expect(
      screen.findByText('Launch feed response was incomplete')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('feed-count')).toHaveTextContent('2');
  });

  it('rejects duplicate canonical identities without erasing settled missions', async () => {
    const user = userEvent.setup();
    const duplicateLaunches = [
      UPCOMING_LAUNCHES[0],
      { ...UPCOMING_LAUNCHES[0], name: 'Conflicting duplicate mission' },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ launches: UPCOMING_LAUNCHES }))
      .mockResolvedValueOnce(response({ launches: duplicateLaunches }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await expect(screen.findByText('2 launches')).resolves.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await expect(
      screen.findByText('Launch feed response was incomplete')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('feed-count')).toHaveTextContent('2');
  });

  it('retains settled missions when a successful response contains an incomplete launch record', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ launches: UPCOMING_LAUNCHES }))
      .mockResolvedValueOnce(
        response({ launches: [{ id: UPCOMING_LAUNCHES[0].id }] })
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await expect(screen.findByText('2 launches')).resolves.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await expect(
      screen.findByText('Launch feed response was incomplete')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('feed-count')).toHaveTextContent('2');
  });

  it('rejects an invalid legacy array response without erasing settled missions', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ launches: UPCOMING_LAUNCHES }))
      .mockResolvedValueOnce(response([{ id: UPCOMING_LAUNCHES[0].id }]));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <FeedRetryHarness />
      </LaunchDataProvider>
    );

    await expect(screen.findByText('2 launches')).resolves.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await expect(
      screen.findByText('Launch feed response was incomplete')
    ).resolves.toBeVisible();
    expect(screen.getByTestId('feed-count')).toHaveTextContent('2');
  });
});

describe('useLaunchIntel retries', () => {
  it('does not request mission intelligence while the device is offline', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    render(<IntelRetryHarness />);

    expect(screen.getByTestId('intel-state')).toHaveTextContent('empty');
    expect(screen.getByTestId('intel-network-state')).toHaveTextContent(
      'offline',
    );
    await user.click(
      screen.getByRole('button', { name: 'Retry intelligence' }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retains the degraded state and suppresses duplicate recovery requests', async () => {
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
        json: async () => ({ error: 'Coverage provider maintenance' }),
      } as Response)
      .mockImplementationOnce(() => retryResponse);
    vi.stubGlobal('fetch', fetchMock);

    render(<IntelRetryHarness />);

    await expect(
      screen.findByText('Coverage provider maintenance')
    ).resolves.toBeVisible();

    const retry = screen.getByRole('button', { name: 'Retry intelligence' });
    await user.click(retry);
    expect(screen.getByTestId('intel-state')).toHaveTextContent(
      'retrying: Coverage provider maintenance'
    );
    await user.click(retry);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveRetry?.(response(LAUNCH_INTEL));
    await waitFor(() =>
      expect(screen.getByTestId('intel-state')).toHaveTextContent(
        LAUNCH_INTEL.summary.rationale
      )
    );
  });
});

describe('useCurrentTime visibility lifecycle', () => {
  it('pauses while hidden and resynchronizes immediately on return', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-26T12:00:00.000Z'));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    const { unmount } = render(<ClockHarness />);

    try {
      expect(screen.getByText('2035-07-26T12:00:00.000Z')).toBeVisible();
      expect(vi.getTimerCount()).toBe(1);

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      fireEvent(document, new Event('visibilitychange'));

      expect(vi.getTimerCount()).toBe(0);

      vi.setSystemTime(new Date('2035-07-26T12:05:00.000Z'));
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      fireEvent(document, new Event('visibilitychange'));

      expect(screen.getByText('2035-07-26T12:05:00.000Z')).toBeVisible();
      expect(vi.getTimerCount()).toBe(1);

      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      unmount();
      Reflect.deleteProperty(document, 'visibilityState');
    }
  });
});
