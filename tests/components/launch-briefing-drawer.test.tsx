import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

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
});
