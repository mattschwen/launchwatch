import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LaunchTicker', () => {
  it('shows a stable provider estimate instead of a false countdown', async () => {
    const estimatedLaunch = {
      ...UPCOMING_LAUNCHES[0],
      date: '2035-08-31T00:00:00.000Z',
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
});
