import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from '@/app/loading';

describe('global route loading state', () => {
  it('keeps a visible mission-control hierarchy while route data resolves', () => {
    const { container } = render(<Loading />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Acquiring mission telemetry',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Synchronizing route' })
    ).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText('Primary route data')
    ).toBeVisible();
    expect(
      screen.getByText('Mission support systems')
    ).toBeVisible();

    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion).toHaveAttribute(
      'aria-labelledby',
      'route-loading-title'
    );
    expect(container.querySelectorAll('.skeleton')).not.toHaveLength(0);
    expect(
      [...container.querySelectorAll('.skeleton')].every((skeleton) =>
        skeleton.closest('[aria-hidden="true"]')
      )
    ).toBe(true);
  });
});
