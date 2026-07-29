import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('useLaunchIntel', () => {
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
});
