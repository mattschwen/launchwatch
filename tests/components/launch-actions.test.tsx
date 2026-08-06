import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LaunchActions from '@/components/launch/LaunchActions';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

describe('LaunchActions', () => {
  it('holds the generic fallback while official coverage is being checked', () => {
    const { rerender } = render(
      <LaunchActions
        launch={UPCOMING_LAUNCHES[0]}
        coverageLoading
        featured
        showCalendar={false}
      />
    );

    expect(
      screen.getByRole('status', { name: 'Checking official coverage' })
    ).toHaveTextContent('Checking coverage');
    expect(
      screen.queryByRole('link', { name: /Find stream.*new tab/i })
    ).not.toBeInTheDocument();

    rerender(
      <LaunchActions
        launch={{
          ...UPCOMING_LAUNCHES[0],
          livestream: 'https://www.youtube.com/watch?v=official-stream',
        }}
        featured
        showCalendar={false}
      />
    );

    const scheduledCoverage = screen.getByRole('link', {
      name: 'Watch mission',
    });
    expect(scheduledCoverage).toHaveAttribute(
      'href',
      '/watch?id=ll2-demo-orbital-dawn'
    );
    expect(scheduledCoverage).toHaveClass('action-button-secondary');
    expect(scheduledCoverage).not.toHaveClass('action-button-stream');
    expect(
      screen.queryByRole('status', { name: 'Checking official coverage' })
    ).not.toBeInTheDocument();
  });

  it('reserves the live action treatment for an active broadcast', () => {
    render(
      <LaunchActions
        launch={{
          ...UPCOMING_LAUNCHES[1],
          isLive: true,
          webcastLive: true,
          status: 'live',
        }}
        featured
        showCalendar={false}
      />
    );

    expect(screen.getByRole('link', { name: 'Watch live' })).toHaveClass(
      'action-button-stream'
    );
  });

  it('labels the search fallback when canonical coverage cannot be checked', () => {
    render(
      <LaunchActions
        launch={UPCOMING_LAUNCHES[0]}
        coverageUnavailable
        featured
        showCalendar={false}
      />
    );

    expect(
      screen.getByRole('link', { name: /Find stream.*new tab/i })
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Official coverage status unavailable; search fallback shown.'
    );
  });

  it('can leave the primary coverage action to the surrounding surface', () => {
    render(
      <LaunchActions
        launch={UPCOMING_LAUNCHES[1]}
        onOpenBriefing={() => undefined}
        showCalendar={false}
        showPrimaryAction={false}
      />
    );

    expect(
      screen.queryByRole('link', { name: 'Watch mission' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open briefing' })
    ).toBeVisible();
  });

  it('keeps every compact mission command visibly labeled', () => {
    render(
      <LaunchActions
        launch={UPCOMING_LAUNCHES[0]}
        onOpenBriefing={() => undefined}
        showPrimaryAction={false}
        showShare
        compact
      />
    );

    expect(screen.getByRole('button', { name: 'Briefing' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Calendar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Share' })).toBeVisible();
  });

  it('uses the detail command grid and keeps calendar options above it', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LaunchActions
        launch={UPCOMING_LAUNCHES[0]}
        onOpenBriefing={() => undefined}
        showShare
        detail
      />
    );

    expect(container.firstChild).toHaveClass(
      'detail-launch-actions',
      'grid-cols-2'
    );

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );
    expect(
      screen.getByRole('group', { name: 'Calendar options' })
    ).toHaveClass('bottom-full', 'left-0');
  });

  it('closes transient calendar options when the canonical mission changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LaunchActions
        launch={UPCOMING_LAUNCHES[0]}
        showPrimaryAction={false}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );
    expect(
      screen.getByRole('group', { name: 'Calendar options' })
    ).toBeVisible();

    rerender(
      <LaunchActions
        launch={UPCOMING_LAUNCHES[1]}
        showPrimaryAction={false}
      />
    );

    expect(
      screen.queryByRole('group', { name: 'Calendar options' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add to calendar' })
    ).toBeVisible();
  });
});
