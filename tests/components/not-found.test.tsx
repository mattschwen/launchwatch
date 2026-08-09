import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import NotFound from '@/app/not-found';

describe('mission not-found state', () => {
  it('focuses truthful recovery for upcoming and completed missions', async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'This mission path is off course.',
    });
    expect(heading).toBeVisible();
    expect(heading).toHaveAttribute('tabindex', '-1');
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      screen.getByText(/belong in the completed-flight archive/i)
    ).toBeVisible();

    const recovery = screen.getByRole('navigation', {
      name: 'Mission recovery',
    });
    expect(recovery).toContainElement(
      screen.getByRole('link', { name: 'View upcoming launches' })
    );
    expect(
      screen.getByRole('link', { name: 'View upcoming launches' })
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('link', { name: 'Search launch archive' })
    ).toHaveAttribute('href', '/history');

    await user.tab();
    expect(
      screen.getByRole('link', { name: 'View upcoming launches' })
    ).toHaveFocus();
  });
});
