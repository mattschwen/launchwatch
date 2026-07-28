import { render, screen, waitFor, within } from '@testing-library/react';
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
    const compactAscentLabel = container.querySelector(
      '[data-trajectory-label="ascent-model"]'
    );
    expect(compactAscentLabel?.querySelectorAll('tspan')[1])
      .toHaveAttribute('font-size', '25');
    expect(screen.getByText('Launch Library 2')).toBeVisible();
  });

  it('opens a focus-managed full-map dialog and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<MissionTrajectory launch={makeLaunch()} />);

    const expandButton = screen.getByRole('button', {
      name: 'Enlarge illustrative trajectory map',
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
    expect(
      dialog.querySelector('[data-enlarged-map-region]')
    ).toHaveClass('min-h-40');
    expect(
      dialog.querySelector('[data-enlarged-map-support]')
    ).toHaveClass('overflow-y-auto');

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
    expect(
      screen.queryByRole('list', { name: 'Trajectory model legend' })
    ).not.toBeInTheDocument();

    rerender(
      <MissionTrajectory launch={makeLaunch({ orbit: 'Unknown' })} />
    );

    expect(screen.getByText('Target orbit unavailable')).toBeVisible();
    expect(screen.getByText('Not supplied')).toBeVisible();
    const legend = screen.getByRole('list', {
      name: 'Trajectory model legend',
    });
    expect(within(legend).getByText('Ascent model')).toBeVisible();
    expect(within(legend).getByText('Reported launch site')).toBeVisible();
    expect(
      within(legend).queryByText('Target-orbit model')
    ).not.toBeInTheDocument();
  });

  it('uses unique IDs for multiple responsive and dialog instances', async () => {
    const user = userEvent.setup();
    render(
      <>
        <MissionTrajectory launch={makeLaunch()} />
        <MissionTrajectory launch={makeLaunch({ id: 'second-launch' })} />
      </>
    );
    const enlargeButtons = screen.getAllByRole('button', {
      name: 'Enlarge illustrative trajectory map',
    });
    await user.click(enlargeButtons[0]);
    await user.click(enlargeButtons[1]);

    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    const ids = [...document.querySelectorAll<HTMLElement>('[id]')].map(
      (element) => element.id
    );

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      screen.getAllByRole('region', { name: 'Mission trajectory' })
    ).toHaveLength(2);

    const closeButtons = screen.getAllByRole('button', {
      name: 'Close full trajectory map',
    });
    await user.click(closeButtons[1]);
    await user.click(
      screen.getByRole('button', { name: 'Close full trajectory map' })
    );
  });

  it('keeps full fact values readable without a title-only disclosure', () => {
    const longSite =
      'Space Launch Complex 40, Cape Canaveral Space Force Station, United States';
    render(
      <MissionTrajectory
        launch={makeLaunch({
          launchSite: longSite,
          location: null,
        })}
      />
    );

    const siteValue = screen.getByText(longSite);
    expect(siteValue).not.toHaveAttribute('title');
    expect(siteValue).toHaveClass('break-words');
    expect(siteValue).not.toHaveClass('truncate');
  });

  it('does not surface a placeholder location over a reported launch site', () => {
    render(
      <MissionTrajectory
        launch={makeLaunch({
          launchSite: 'Space Launch Complex 40',
          location: {
            lat: 28.5619,
            lng: -80.5774,
            name: 'Unknown Site',
            countryCode: 'US',
          },
        })}
      />
    );

    expect(screen.getByText('Space Launch Complex 40')).toBeInTheDocument();
    expect(screen.queryByText('Unknown Site')).not.toBeInTheDocument();
  });

  it('does not show a phase legend before a mission is available', () => {
    render(<MissionTrajectory launch={null} />);

    expect(
      screen.queryByRole('list', { name: 'Trajectory model legend' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Enlarge illustrative trajectory map',
      })
    ).toBeDisabled();
  });
});
