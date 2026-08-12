import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Footer from '@/components/Footer';
import LaunchTicker from '@/components/layout/LaunchTicker';
import { LaunchDataProvider } from '@/lib/contexts';
import { FEED_META, UPCOMING_LAUNCHES } from '../fixtures/launches';

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function errorResponse(body: unknown): Response {
  return {
    ok: false,
    status: 503,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LaunchTicker', () => {
  it('names a prelaunch broadcast without claiming the mission is in flight', async () => {
    const coverageLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'Go for Launch',
      isLive: true,
      webcastLive: true,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({ launches: [coverageLaunch], meta: FEED_META })
      )
    );

    render(
      <LaunchDataProvider>
        <LaunchTicker />
      </LaunchDataProvider>
    );

    const missionLink = await screen.findByRole('link', {
      name: /Orbital Dawn/,
    });
    expect(missionLink).toHaveTextContent('COVERAGE');
    expect(missionLink).not.toHaveTextContent('IN FLIGHT');
    expect(missionLink.querySelector('time')).toBeInTheDocument();
  });

  it('shows a stable provider estimate instead of a false countdown', async () => {
    const estimatedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      date: '2035-08-31T00:00:00.000Z',
      dateUnix: 2072131200,
      datePrecision: { name: 'Month', abbrev: 'M' },
      status: 'tbd' as const,
      statusName: 'To Be Determined',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({ launches: [estimatedLaunch], meta: FEED_META })
      )
    );

    render(
      <LaunchDataProvider>
        <LaunchTicker />
      </LaunchDataProvider>
    );

    const missionLink = await screen.findByRole('link', {
      name: /Orbital Dawn/,
    });
    expect(missionLink).toHaveTextContent('August 2035 · Month estimate');
    expect(missionLink).not.toHaveTextContent('T−');
    expect(missionLink.querySelector('time')).toHaveAttribute(
      'datetime',
      estimatedLaunch.date
    );
  });

  it('keeps an hour-level approximate countdown in the compact status bar', async () => {
    const estimatedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      datePrecision: { name: 'Hour', abbrev: 'HR' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({ launches: [estimatedLaunch], meta: FEED_META })
      )
    );

    render(
      <LaunchDataProvider>
        <LaunchTicker />
      </LaunchDataProvider>
    );

    const missionLink = await screen.findByRole('link', {
      name: /Orbital Dawn/,
    });
    expect(missionLink).toHaveTextContent('≈T−');
    expect(missionLink).toHaveTextContent('Hour estimate');
    const spokenCountdown = screen.getByText(
      /Estimated countdown: .*Hour estimate/i
    );
    expect(spokenCountdown).toHaveClass('sr-only', 'countdown-spoken');
    const tickerCountdown = missionLink.querySelector('time');
    expect(tickerCountdown).toContainElement(spokenCountdown);
    expect(tickerCountdown).not.toHaveAttribute('aria-label');
    expect(tickerCountdown).toHaveClass(
      '!font-medium',
      '!text-[var(--text-muted)]'
    );
    expect(
      tickerCountdown?.querySelector('.countdown-compact-tick')
    ).not.toBeInTheDocument();
  });

  it('gives the exact compact ticker a natural-language countdown name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({ launches: UPCOMING_LAUNCHES, meta: FEED_META })
      )
    );

    render(
      <LaunchDataProvider>
        <LaunchTicker />
      </LaunchDataProvider>
    );

    const missionLink = await screen.findByRole('link', {
      name: /Orbital Dawn.*\d+ days?, \d+ hours?, \d+ minutes?, \d+ seconds? until launch/i,
    });
    const tickerCountdown = missionLink.querySelector('time');
    const spokenCountdown = tickerCountdown?.querySelector(
      '.countdown-spoken'
    );

    expect(missionLink).toHaveTextContent(/T−\d+d \d+h/);
    expect(spokenCountdown).toHaveTextContent(
      /\d+ days?, \d+ hours?, \d+ minutes?, \d+ seconds? until launch/
    );
    expect(tickerCountdown?.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      /T−\d+d \d+h/
    );
  });

  it('keeps the last successful mission reachable after a refresh failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ launches: UPCOMING_LAUNCHES, meta: FEED_META })
      )
      .mockResolvedValueOnce(errorResponse({ error: 'Provider maintenance' }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <LaunchTicker />
        <Footer />
      </LaunchDataProvider>
    );

    const missionLink = await screen.findByRole('link', {
      name: /Orbital Dawn/,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh launch schedule' })
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(missionLink).toHaveTextContent('LAST KNOWN');
    expect(missionLink).toHaveAttribute(
      'href',
      '/launch/ll2-demo-orbital-dawn'
    );
    expect(screen.queryByText('SCHEDULE DEGRADED')).not.toBeInTheDocument();
  });

  it('does not present retained live state as confirmed coverage', async () => {
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'In Flight',
      isLive: true,
      webcastLive: true,
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ launches: [liveLaunch], meta: FEED_META })
        )
        .mockResolvedValueOnce(errorResponse({ error: 'Provider maintenance' }))
    );

    render(
      <LaunchDataProvider>
        <LaunchTicker />
        <Footer />
      </LaunchDataProvider>
    );

    const missionLink = await screen.findByRole('link', {
      name: /Orbital Dawn/,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh launch schedule' })
    );

    await waitFor(() =>
      expect(missionLink).toHaveTextContent('Coverage unconfirmed')
    );
    expect(missionLink).toHaveTextContent('LAST KNOWN');
    expect(missionLink).not.toHaveTextContent('LIVE');
    expect(missionLink).not.toHaveTextContent('In progress');
    expect(missionLink).toHaveAttribute(
      'href',
      '/watch?id=ll2-demo-orbital-dawn'
    );
  });

  it('does not present stale cached live state as confirmed coverage', async () => {
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'In Flight',
      isLive: true,
      webcastLive: true,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          launches: [liveLaunch],
          meta: { ...FEED_META, stale: true },
        })
      )
    );

    render(
      <LaunchDataProvider>
        <LaunchTicker />
      </LaunchDataProvider>
    );

    const missionLink = await screen.findByRole('link', {
      name: /Orbital Dawn/,
    });
    expect(missionLink).toHaveTextContent('LAST KNOWN');
    expect(missionLink).toHaveTextContent('Coverage unconfirmed');
    expect(missionLink).not.toHaveTextContent('LIVE');
    expect(missionLink).not.toHaveTextContent('In progress');
    expect(missionLink).toHaveAttribute(
      'href',
      '/watch?id=ll2-demo-orbital-dawn'
    );
  });
});
