import { render, screen } from '@testing-library/react';
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
      screen.queryByRole('link', { name: 'Find stream' })
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

    expect(
      screen.getByRole('link', { name: 'Watch mission' })
    ).toHaveAttribute('href', '/watch?id=ll2-demo-orbital-dawn');
    expect(
      screen.queryByRole('status', { name: 'Checking official coverage' })
    ).not.toBeInTheDocument();
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

    expect(screen.getByRole('link', { name: 'Find stream' })).toBeVisible();
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
});
