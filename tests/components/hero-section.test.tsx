import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HeroSection from '@/components/launch/HeroSection';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

const defaultProps = {
  activeLaunch: null,
  loading: false,
  refreshing: false,
  error: null,
  partial: false,
  refresh: vi.fn().mockResolvedValue(undefined),
};

describe('HeroSection', () => {
  it('keeps the page hierarchy and mission-acquisition state visible while loading', () => {
    render(<HeroSection {...defaultProps} loading />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Acquiring next mission',
    });
    const section = heading.closest('section');

    expect(heading).toBeVisible();
    expect(
      screen.getByText(
        'Verifying launch windows and mission details across connected providers.'
      )
    ).toBeVisible();
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(section).toHaveClass('signal-cold');
  });

  it('reports a healthy empty schedule without presenting it as a failure', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);

    render(<HeroSection {...defaultProps} refresh={refresh} />);

    expect(
      screen.getByRole('heading', { name: 'Launch queue is clear.' })
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'We could not load the next mission.',
      })
    ).not.toBeInTheDocument();
    const section = screen
      .getByRole('heading', { name: 'Launch queue is clear.' })
      .closest('section');
    expect(section).toHaveClass('holo-card', 'signal-nominal');

    await user.click(
      screen.getByRole('button', { name: 'Refresh mission queue' })
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('reserves the critical treatment for an actual provider error', () => {
    render(
      <HeroSection
        {...defaultProps}
        error="Provider maintenance"
      />
    );

    expect(
      screen.getByRole('heading', {
        name: 'We could not load the next mission.',
      })
    ).toBeVisible();
    expect(screen.getByText('Provider maintenance')).toBeVisible();
    expect(
      screen
        .getByRole('heading', {
          name: 'We could not load the next mission.',
        })
        .closest('section')
    ).toHaveClass('signal-critical');
  });

  it('uses the magenta live signal treatment for active coverage', () => {
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'In flight',
      isLive: true,
      webcastLive: true,
    };

    render(<HeroSection {...defaultProps} activeLaunch={liveLaunch} />);

    expect(
      screen.getByRole('heading', { name: liveLaunch.name }).closest('section')
    ).toHaveClass('signal-live');
    expect(screen.getByText('LIVE NOW')).toHaveClass(
      'text-[var(--console-magenta)]'
    );
  });

  it('marks a retained mission as last-known after refresh failure', () => {
    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={UPCOMING_LAUNCHES[0]}
        error="Provider maintenance"
      />
    );

    expect(screen.getByText('Last-known mission · refresh failed')).toBeVisible();
    expect(
      screen
        .getByRole('heading', { name: UPCOMING_LAUNCHES[0].name })
        .closest('section')
    ).toHaveClass('signal-warm');
  });

  it('does not present retained live coverage as current', () => {
    const liveLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'In flight',
      isLive: true,
      webcastLive: true,
    };

    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={liveLaunch}
        error="Provider maintenance"
      />
    );

    expect(screen.getByText('Last-known live mission')).toBeVisible();
    expect(screen.getByText('COVERAGE UNCONFIRMED')).toBeVisible();
    expect(screen.queryByText('LIVE NOW')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: liveLaunch.name }).closest('section')
    ).toHaveClass('signal-warm');
  });
});
