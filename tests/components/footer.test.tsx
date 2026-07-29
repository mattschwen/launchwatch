import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Footer from '@/components/Footer';
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

describe('Footer', () => {
  it('keeps refresh focus and prevents duplicate requests while busy', async () => {
    const user = userEvent.setup();
    let resolveRefresh: ((value: Response) => void) | undefined;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ launches: UPCOMING_LAUNCHES, meta: FEED_META })
      )
      .mockReturnValueOnce(refreshResponse);
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LaunchDataProvider>
        <Footer />
      </LaunchDataProvider>
    );

    const refresh = await screen.findByRole('button', { name: 'Refresh now' });
    refresh.focus();
    await user.keyboard('{Enter}');

    expect(refresh).toHaveFocus();
    expect(refresh).not.toBeDisabled();
    expect(refresh).toHaveAttribute('aria-disabled', 'true');
    expect(refresh).toHaveAttribute('aria-busy', 'true');
    expect(refresh).toHaveTextContent('Refreshing');

    await user.keyboard('{Enter}');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveRefresh?.(
      response({ launches: UPCOMING_LAUNCHES, meta: FEED_META })
    );

    await waitFor(() => {
      expect(refresh).toHaveAttribute('aria-disabled', 'false');
      expect(refresh).toHaveAttribute('aria-busy', 'false');
      expect(refresh).toHaveTextContent('Refresh now');
    });
    expect(refresh).toHaveFocus();
  });
});
