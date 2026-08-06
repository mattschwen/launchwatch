import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MissionTrajectory from '@/components/MissionTrajectory';
import { TRAJECTORY_DISCLOSURE } from '@/lib/trajectory';
import type { Launch } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function makeLaunch(overrides: Partial<Launch> = {}): Launch {
  return {
    ...UPCOMING_LAUNCHES[0],
    ...overrides,
  };
}

describe('MissionTrajectory', () => {
  it('renders a ready compact map with both modeled phases and disclosure', () => {
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
      container.querySelector('[data-map-availability="ready"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-trajectory-phase="ascent-model"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        '[data-trajectory-phase="target-orbit-model"]'
      )
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        '[data-trajectory-marker="reported-launch-site"]'
      )
    ).toBeInTheDocument();
  });

  it('opens a focus-managed full-map dialog and closes with Escape', async () => {
    const user = userEvent.setup();
    const missionName =
      'Falcon 9 Block 5 | BlueBird 11-13 (Block 2 #6-8)';
    render(
      <MissionTrajectory launch={makeLaunch({ name: missionName })} />
    );

    const expandButton = screen.getByRole('button', {
      name: 'Enlarge illustrative trajectory map',
    });
    await user.click(expandButton);

    const dialog = await screen.findByRole('dialog', {
      name: missionName,
    });
    expect(dialog).toBeVisible();
    const dialogTitle = within(dialog).getByRole('heading', {
      name: missionName,
    });
    expect(dialogTitle).toHaveClass('break-words');
    expect(dialogTitle).not.toHaveClass('truncate');
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Close full trajectory map' })
      ).toHaveFocus();
    });
    expect(screen.getAllByText(TRAJECTORY_DISCLOSURE)).toHaveLength(4);
    expect(
      dialog.querySelector('[data-enlarged-map-region]')
    ).toHaveClass('min-h-0');
    expect(
      dialog.querySelector('[data-enlarged-map-support]')
    ).toHaveClass('overflow-y-auto');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(expandButton).toHaveFocus();
    });
  });

  it('lets detail users select and clear modeled phases', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MissionTrajectory launch={makeLaunch()} variant="detail" />
    );
    const rail = screen.getByRole('list', {
      name: 'Mission model phases',
    });
    const site = within(rail).getByRole('button', {
      name: /Reported launch site/i,
    });
    const ascent = within(rail).getByRole('button', {
      name: /Illustrative ascent/i,
    });
    const orbit = within(rail).getByRole('button', {
      name: /Reported target orbit/i,
    });
    const ascentGroup = container.querySelector(
      '[data-map-phase-group="ascent-model"]'
    );
    const orbitGroup = container.querySelector(
      '[data-map-phase-group="target-orbit-model"]'
    );

    expect(site).toHaveAttribute('aria-pressed', 'false');
    expect(ascent).toHaveAttribute('aria-pressed', 'false');
    expect(orbit).toHaveAttribute('aria-pressed', 'false');

    await user.click(ascent);

    expect(ascent).toHaveAttribute('aria-pressed', 'true');
    expect(ascentGroup).toHaveAttribute('opacity', '1');
    expect(orbitGroup).toHaveAttribute('opacity', '0.25');

    await user.click(ascent);

    expect(ascent).toHaveAttribute('aria-pressed', 'false');
    expect(orbitGroup).toHaveAttribute('opacity', '1');
  });

  it('switches a detail map between mission focus and the global view', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MissionTrajectory launch={makeLaunch()} variant="detail" />
    );
    const focus = screen.getByRole('button', {
      name: /Mission focus/i,
    });
    const global = screen.getByRole('button', { name: 'Global' });
    const map = container.querySelector('[data-trajectory-map]');
    const focusView = map?.getAttribute('data-map-view');

    expect(focus).toHaveAttribute('aria-pressed', 'true');
    expect(global).toHaveAttribute('aria-pressed', 'false');
    expect(focusView).not.toBe('0.0:0.0:1000.0:500.0');

    await user.click(global);

    expect(global).toHaveAttribute('aria-pressed', 'true');
    expect(focus).toHaveAttribute('aria-pressed', 'false');
    expect(map).toHaveAttribute(
      'data-map-view',
      '0.0:0.0:1000.0:500.0'
    );

    await user.click(focus);

    expect(focus).toHaveAttribute('aria-pressed', 'true');
    expect(map).toHaveAttribute('data-map-view', focusView);
  });

  it('retains focus while removing unavailable map zoom from the tab sequence', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MissionTrajectory launch={makeLaunch()} variant="detail" />
    );
    const zoomOut = screen.getByRole('button', { name: 'Zoom map out' });
    const zoomIn = screen.getByRole('button', { name: 'Zoom map in' });
    const map = container.querySelector('[data-trajectory-map]');

    expect(zoomOut).toHaveAttribute('aria-disabled', 'true');
    expect(zoomOut).toHaveAttribute('tabindex', '-1');
    expect(zoomOut).not.toBeDisabled();
    expect(zoomIn).toHaveAttribute('aria-disabled', 'false');
    expect(zoomIn).not.toHaveAttribute('tabindex');

    zoomIn.focus();
    await user.keyboard('{Enter}{Enter}');

    expect(zoomIn).toHaveFocus();
    expect(zoomIn).toHaveAttribute('aria-disabled', 'true');
    expect(zoomIn).toHaveAttribute('tabindex', '-1');
    expect(zoomIn).not.toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Map zoom level 3 of 3.'
    );
    const maximumZoomView = map?.getAttribute('data-map-view');

    await user.keyboard('{Enter}');
    expect(map).toHaveAttribute('data-map-view', maximumZoomView);
    expect(zoomIn).toHaveFocus();

    zoomOut.focus();
    await user.keyboard('{Enter}{Enter}');

    expect(zoomOut).toHaveFocus();
    expect(zoomOut).toHaveAttribute('aria-disabled', 'true');
    expect(zoomOut).toHaveAttribute('tabindex', '-1');
    expect(zoomOut).not.toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Map zoom level 1 of 3.'
    );
  });

  it('keeps a reported site visible at the antimeridian in global view', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MissionTrajectory
        launch={makeLaunch({
          location: {
            lat: 0,
            lng: -179.9,
            name: 'Dateline Test Site',
          },
        })}
        variant="detail"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Global' }));

    expect(
      container.querySelector(
        '[data-trajectory-marker="reported-launch-site"]'
      )
    ).toBeInTheDocument();
  });

  it('resets map controls when the selected mission changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MissionTrajectory launch={makeLaunch()} variant="detail" />
    );

    await user.click(screen.getByRole('button', { name: 'Global' }));
    expect(
      screen.getByRole('button', { name: 'Global' })
    ).toHaveAttribute('aria-pressed', 'true');

    rerender(
      <MissionTrajectory
        launch={makeLaunch({
          id: 'replacement-launch',
          name: 'Replacement Launch',
        })}
        variant="detail"
      />
    );

    expect(
      screen.getByRole('button', { name: /Mission focus/i })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Global' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows an honest orbit-only state when coordinates are missing', () => {
    const { container } = render(
      <MissionTrajectory
        launch={makeLaunch({
          location: null,
          launchSite: 'Reported pad without coordinates',
        })}
        variant="detail"
      />
    );

    expect(
      container.querySelector('[data-map-availability="orbit-only"]')
    ).toBeInTheDocument();
    expect(screen.getByText('Launch coordinates not supplied')).toBeVisible();
    expect(
      screen.getByText(/reports Low Earth Orbit, but no geographic origin/i)
    ).toBeVisible();
    expect(screen.getByText('Geographic model unavailable')).toBeVisible();
    expect(
      screen.getByText(
        /Reported pad without coordinates is reported, but geographic coordinates were not supplied/i
      )
    ).toBeVisible();
    expect(
      container.querySelector('[data-trajectory-phase]')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Mission model phases' })
    ).not.toBeInTheDocument();
  });

  it('shows only an accurate site locator when the orbit is missing', () => {
    const { container } = render(
      <MissionTrajectory
        launch={makeLaunch({ orbit: 'Unknown' })}
        variant="detail"
      />
    );

    expect(
      container.querySelector('[data-map-availability="site-only"]')
    ).toBeInTheDocument();
    expect(screen.getByText('Site locator only')).toBeVisible();
    expect(
      screen.getByText(/no directional path is inferred/i)
    ).toBeVisible();
    expect(
      container.querySelector(
        '[data-trajectory-marker="reported-launch-site"]'
      )
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-trajectory-phase]')
    ).not.toBeInTheDocument();
    const rail = screen.getByRole('list', {
      name: 'Mission model phases',
    });
    expect(
      within(rail).getByRole('button', {
        name: /Reported launch site/i,
      })
    ).toBeVisible();
    expect(
      within(rail).queryByRole('button', {
        name: /Illustrative ascent/i,
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Not supplied')).toBeVisible();
  });

  it('shows unavailable when neither coordinates nor orbit data exists', () => {
    const { container } = render(
      <MissionTrajectory
        launch={makeLaunch({
          location: null,
          orbit: null,
        })}
      />
    );

    expect(
      container.querySelector('[data-map-availability="unavailable"]')
    ).toBeInTheDocument();
    expect(screen.getByText('Launch coordinates not supplied')).toBeVisible();
    expect(
      screen.getByText(/reported site remains listed below/i)
    ).toBeVisible();
    expect(
      container.querySelector('[data-trajectory-phase]')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Trajectory model legend' })
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
      screen.getAllByRole('region', {
        name: 'Mission trajectory',
        hidden: true,
      })
    ).toHaveLength(2);

    const closeButtons = screen.getAllByRole('button', {
      name: 'Close full trajectory map',
    });
    await user.click(closeButtons[1]);
    await user.click(
      screen.getByRole('button', { name: 'Close full trajectory map' })
    );
  });

  it('does not surface placeholder location copy over the reported site', () => {
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
        variant="detail"
      />
    );

    expect(screen.getAllByText('SLC-40').length).toBeGreaterThan(0);
    expect(screen.queryByText('Unknown Site')).not.toBeInTheDocument();
  });

  it('keeps the reported pad and facility readable in detail facts', () => {
    const reportedSite =
      'Space Launch Complex 40, Cape Canaveral Space Force Station';
    render(
      <MissionTrajectory
        launch={makeLaunch({
          launchSite: reportedSite,
          location: {
            lat: 28.5619,
            lng: -80.5774,
            name: 'Cape Canaveral',
          },
        })}
        variant="detail"
      />
    );

    expect(
      screen.getAllByText('SLC-40 · Cape Canaveral').length
    ).toBeGreaterThan(0);
  });

  it('renders an honest waiting state before a mission is available', () => {
    const { container } = render(<MissionTrajectory launch={null} />);

    expect(screen.getByText('Awaiting mission selection')).toBeVisible();
    expect(
      container.querySelector('[data-map-availability="none"]')
    ).toBeInTheDocument();
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
