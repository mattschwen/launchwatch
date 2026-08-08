import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLaunchIntel } from '@/lib/hooks';
import {
  LAUNCH_INTEL,
  UPCOMING_LAUNCHES,
} from '@/tests/fixtures/launches';
import type { LaunchIntel } from '@/lib/types';

function intelResponse(intel: LaunchIntel): Response {
  return new Response(JSON.stringify(intel), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useLaunchIntel', () => {
  it('rejects an incomplete successful intelligence response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ meta: { generatedAt: '2035-07-26T12:00:00.000Z' } }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { result } = renderHook(() =>
      useLaunchIntel(UPCOMING_LAUNCHES[0]),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.intel).toBeNull();
    expect(result.current.error).toBe(
      'Mission intelligence response was incomplete',
    );
  });

  it('does not expose intelligence from a previously selected mission', async () => {
    let resolveSecondRequest: ((response: Response) => void) | undefined;
    const secondIntel: LaunchIntel = {
      ...LAUNCH_INTEL,
      summary: {
        ...LAUNCH_INTEL.summary,
        rationale: 'Signals for Polaris Relay.',
      },
    };

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(intelResponse(LAUNCH_INTEL))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecondRequest = resolve;
          }),
      );

    const { result, rerender } = renderHook(
      ({ launch }) => useLaunchIntel(launch),
      { initialProps: { launch: UPCOMING_LAUNCHES[0] } },
    );

    await waitFor(() => expect(result.current.intel).toEqual(LAUNCH_INTEL));

    rerender({ launch: UPCOMING_LAUNCHES[1] });

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.intel).toBeNull();

    await act(async () => {
      resolveSecondRequest?.(intelResponse(secondIntel));
    });

    await waitFor(() => expect(result.current.intel).toEqual(secondIntel));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not carry an earlier mission error into the next request', async () => {
    let resolveSecondRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Orbital Dawn feed unavailable'))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecondRequest = resolve;
          }),
      );

    const { result, rerender } = renderHook(
      ({ launch }) => useLaunchIntel(launch),
      { initialProps: { launch: UPCOMING_LAUNCHES[0] } },
    );

    await waitFor(() =>
      expect(result.current.error).toBe('Orbital Dawn feed unavailable'),
    );

    rerender({ launch: UPCOMING_LAUNCHES[1] });

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSecondRequest?.(intelResponse(LAUNCH_INTEL));
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('does not auto-poll before a server retry window expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-26T12:00:00.000Z'));
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      isLive: true,
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'Too many intelligence requests. Try again later.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '600',
            },
          },
        ),
      )
      .mockResolvedValue(intelResponse(LAUNCH_INTEL));

    const { result } = renderHook(() => useLaunchIntel(liveLaunch));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.error).toBe(
      'Too many intelligence requests. Try again later.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8 * 60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.intel).toEqual(LAUNCH_INTEL);
  });
});
