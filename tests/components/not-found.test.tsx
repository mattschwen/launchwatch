import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFound from '@/app/not-found';

describe('mission not-found state', () => {
  it('offers truthful recovery for upcoming and completed missions', () => {
    render(<NotFound />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'This mission path is off course.',
      })
    ).toBeVisible();
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
  });
});
