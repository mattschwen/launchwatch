import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MissionTrajectory from '@/components/MissionTrajectory';
import type { Launch } from '@/lib/types';
import { TRAJECTORY_DISCLOSURE } from '@/lib/trajectory';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function makeLaunch(overrides: Partial<Launch> = {}): Launch {
  return {
    ...UPCOMING_LAUNCHES[0],
    ...overrides,
  };
}

describe('MissionTrajectory', () => {
  it('labels its modeled phases and keeps the disclosure visible', () => {
    const { container } = render(
      <MissionTrajectory launch={makeLaunch()} />
    );

    expect(
      screen.getByRole('heading', { name: 'Mission trajectory' })
    ).toBeVisible();
    expect(screen.getByText('Illustrative model')).toBeVisible();
    expect(screen.getAllByText(TRAJECTORY_DISCLOSURE)).toHaveLength(2);
    expect(screen.getByText('Ascent model')).toBeVisible();
    expect(screen.getByText('Target-orbit model')).toBeVisible();
    expect(
      container.querySelector('[data-trajectory-phase="ascent-model"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-trajectory-phase="target-orbit-model"]')
    ).toBeInTheDocument();
    expect(screen.getByText('Launch Library 2')).toBeVisible();
  });

  it('opens a focus-managed full-map dialog and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<MissionTrajectory launch={makeLaunch()} />);

    const expandButton = screen.getByRole('button', {
      name: 'View full illustrative trajectory map',
    });
    await user.click(expandButton);

    const dialog = await screen.findByRole('dialog', {
      name: /Orbital Dawn/i,
    });
    expect(dialog).toBeVisible();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Close full trajectory map' })
      ).toHaveFocus();
    });
    expect(screen.getAllByText(TRAJECTORY_DISCLOSURE)).toHaveLength(4);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(expandButton).toHaveFocus();
    });
  });

  it('shows honest fallbacks for missing coordinates and target orbit', () => {
    const { rerender } = render(
      <MissionTrajectory
        launch={makeLaunch({
          location: null,
          launchSite: 'Reported pad without coordinates',
        })}
      />
    );

    expect(screen.getByText('Launch coordinates unavailable')).toBeVisible();
    expect(
      screen.getByText(/trajectory model cannot be drawn/i)
    ).toBeVisible();

    rerender(
      <MissionTrajectory launch={makeLaunch({ orbit: null })} />
    );

    expect(screen.getAllByText('Target orbit unavailable').length)
      .toBeGreaterThan(0);
    expect(screen.getByText('Not supplied')).toBeVisible();
  });
});
