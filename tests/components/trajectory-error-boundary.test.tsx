import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TrajectoryErrorBoundary from '@/components/trajectory/TrajectoryErrorBoundary';

function TrajectoryProbe({ failed, label }: { failed: boolean; label: string }) {
  if (failed) throw new Error('Trajectory chunk failed');
  return <p>{label}</p>;
}

describe('TrajectoryErrorBoundary', () => {
  it('contains a trajectory fault and resets for a newly selected mission', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onError = vi.fn();
    const view = render(
      <TrajectoryErrorBoundary resetKey="mission-a" onError={onError}>
        <TrajectoryProbe failed label="Mission A trajectory" />
      </TrajectoryErrorBoundary>
    );

    expect(
      screen.getByRole('alert', { name: 'Mission trajectory unavailable' })
    ).toBeVisible();
    expect(onError).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Retry mission trajectory' })
    ).toBeVisible();

    view.rerender(
      <TrajectoryErrorBoundary resetKey="mission-b" onError={onError}>
        <TrajectoryProbe failed={false} label="Mission B trajectory" />
      </TrajectoryErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Mission B trajectory')).toBeVisible();
      expect(
        screen.queryByRole('alert', {
          name: 'Mission trajectory unavailable',
        })
      ).not.toBeInTheDocument();
    });
  });
});
