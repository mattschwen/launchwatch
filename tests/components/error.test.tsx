import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '@/app/error';

describe('global route error state', () => {
  it('moves keyboard recovery to each newly reported route fault', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const firstError = new Error('Initial route fault');
    const view = render(<ErrorBoundary error={firstError} reset={reset} />);
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Mission control hit a fault.',
    });

    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute('tabindex', '-1');

    await user.tab();
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(retry).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(reset).toHaveBeenCalledOnce();

    const secondError = new Error('Replacement route fault');
    view.rerender(<ErrorBoundary error={secondError} reset={reset} />);
    await waitFor(() => expect(heading).toHaveFocus());
  });
});
