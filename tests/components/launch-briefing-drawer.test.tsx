import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import { HISTORICAL_LAUNCHES, UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('LaunchBriefingDrawer', () => {
  it('isolates the modal from background content and restores it on close', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const launch = UPCOMING_LAUNCHES[0];
    const view = render(
      <>
        <button type="button">Open briefing</button>
        <LaunchBriefingDrawer launch={launch} open={false} onClose={onClose} />
      </>
    );
    const trigger = screen.getByRole('button', { name: 'Open briefing' });
    trigger.focus();

    view.rerender(
      <>
        <button type="button">Open briefing</button>
        <LaunchBriefingDrawer launch={launch} open onClose={onClose} />
      </>
    );

    expect(await screen.findByRole('dialog', { name: launch.name })).toBeVisible();
    expect(view.container).toHaveAttribute('aria-hidden', 'true');
    expect(view.container.inert).toBe(true);
    expect(
      screen.queryByRole('button', { name: 'Open briefing' })
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Close mission briefing' })
    ).toHaveLength(1);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Close mission briefing' })
      ).toHaveFocus();
    });
    await user.click(
      screen.getByRole('button', { name: 'Close mission briefing' })
    );
    expect(onClose).toHaveBeenCalledOnce();

    view.rerender(
      <>
        <button type="button">Open briefing</button>
        <LaunchBriefingDrawer launch={launch} open={false} onClose={onClose} />
      </>
    );

    expect(view.container).not.toHaveAttribute('aria-hidden');
    expect(view.container.inert).not.toBe(true);
    expect(screen.getByRole('button', { name: 'Open briefing' })).toHaveFocus();
  });

  it('lets users reveal every provider timeline event without losing the compact scan path', async () => {
    const user = userEvent.setup();
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      timeline: Array.from({ length: 10 }, (_, index) => ({
        type: `Timeline event ${index + 1}`,
        relativeTime: `T+00:${String(index).padStart(2, '0')}:00`,
        description: `Provider detail for event ${index + 1}.`,
      })),
    };

    render(
      <LaunchBriefingDrawer
        launch={launch}
        open
        onClose={vi.fn()}
      />
    );

    const timeline = screen.getByRole('region', { name: 'Launch timeline' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(8);
    expect(within(timeline).queryByText('Timeline event 10')).not.toBeInTheDocument();

    const reveal = within(timeline).getByRole('button', {
      name: 'Show all 10 timeline events',
    });
    expect(reveal).toHaveAttribute('aria-expanded', 'false');

    await user.click(reveal);

    expect(within(timeline).getAllByRole('listitem')).toHaveLength(10);
    expect(within(timeline).getByText('Timeline event 10')).toBeVisible();
    expect(reveal).toHaveAttribute('aria-expanded', 'true');

    await user.click(reveal);

    expect(within(timeline).getAllByRole('listitem')).toHaveLength(8);
    expect(within(timeline).queryByText('Timeline event 10')).not.toBeInTheDocument();
  });

  it('uses the structured mission name in its primary heading', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      name: 'Falcon Heavy | Nancy Grace Roman Space Telescope',
      missionName: 'Nancy Grace Roman Space Telescope',
    };

    render(
      <LaunchBriefingDrawer launch={launch} open onClose={vi.fn()} />
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Nancy Grace Roman Space Telescope',
      })
    ).toBeVisible();
  });

  it('hands off to the provider-curated official mission page', () => {
    const launch = UPCOMING_LAUNCHES[0];

    render(
      <LaunchBriefingDrawer launch={launch} open onClose={vi.fn()} />
    );

    expect(
      screen.getByRole('link', {
        name: /Official page.*opens in a new tab/i,
      })
    ).toHaveAttribute('href', 'https://example.test/orbital-dawn');
  });

  it('surfaces provider-confirmed first-stage history and recovery plans', () => {
    const launch = UPCOMING_LAUNCHES[0];

    render(
      <LaunchBriefingDrawer launch={launch} open onClose={vi.fn()} />
    );

    const dialog = screen.getByRole('dialog', { name: launch.name });
    const firstStage = within(dialog)
      .getByText('First stage')
      .closest('[data-first-stage-signal]');

    expect(firstStage).toHaveTextContent('B2042 · Flight 7');
    expect(firstStage).toHaveTextContent('Flight-proven booster');
    expect(firstStage).toHaveTextContent(
      'Recovery planned · Autonomous Recovery Platform (ARP)',
    );
  });

  it('preserves provider mission type, program, and orbit context', () => {
    const launch = UPCOMING_LAUNCHES[0];

    render(
      <LaunchBriefingDrawer launch={launch} open onClose={vi.fn()} />
    );

    const dialog = screen.getByRole('dialog', { name: launch.name });
    const profile = within(dialog)
      .getByText('Mission profile')
      .closest('[data-mission-profile-signal]');

    expect(profile).toHaveTextContent('Communications');
    expect(profile).toHaveTextContent('Program · LaunchWatch Test Program');
    expect(profile).toHaveTextContent('Orbit · Low Earth Orbit');
  });

  it('identifies when the provider last revised the mission record', () => {
    const launch = UPCOMING_LAUNCHES[0];

    render(
      <LaunchBriefingDrawer launch={launch} open onClose={vi.fn()} />
    );

    const revision = screen
      .getByText('Provider revision')
      .closest('[data-provider-revision-signal]');
    expect(revision).toHaveTextContent('Jul 26, 2035 · 11:42 UTC');
  });

  it('explains the provider mission state in the briefing', () => {
    const launch = UPCOMING_LAUNCHES[0];

    render(
      <LaunchBriefingDrawer launch={launch} open onClose={vi.fn()} />
    );

    const status = screen
      .getByText('Provider status')
      .closest('[data-provider-status-signal]');
    expect(status).toHaveTextContent('Go');
    expect(status).toHaveTextContent(
      'Current T-0 confirmed by official or reliable sources.',
    );
  });

  it('retains launch cadence in the mission briefing', () => {
    const launch = UPCOMING_LAUNCHES[0];

    render(
      <LaunchBriefingDrawer launch={launch} open onClose={vi.fn()} />
    );

    const cadence = screen
      .getByText('Launch cadence · 2035')
      .closest('[data-launch-cadence-signal]');
    expect(cadence).toHaveTextContent('Provider attempt #41');
    expect(cadence).toHaveTextContent('Pad attempt #19');
    expect(cadence).toHaveTextContent('Worldwide orbital #132');
  });

  it('keeps a provider failure diagnosis visible in the briefing', () => {
    render(
      <LaunchBriefingDrawer
        launch={HISTORICAL_LAUNCHES[1]}
        open
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('note', {
        name: /Provider failure report: Vehicle lost during the qualification ascent/,
      }),
    ).toBeVisible();
  });
});
