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

  it('names a provider hold instead of presenting a nominal next launch', () => {
    const heldLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'tbd' as const,
      statusName: 'On Hold',
    };

    render(<HeroSection {...defaultProps} activeLaunch={heldLaunch} />);

    const hero = screen
      .getByRole('heading', { name: heldLaunch.name })
      .closest('section');
    expect(hero).toHaveClass('signal-critical');
    expect(screen.getByText('Launch status alert')).toBeVisible();
    expect(
      screen.getByRole('status', { name: 'Launch status: On Hold' })
    ).toBeVisible();
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
    expect(screen.getByText('IN FLIGHT')).toHaveClass(
      'text-[var(--console-magenta)]'
    );
  });

  it('keeps the launch countdown visible while prelaunch coverage is live', () => {
    const coverageLaunch = {
      ...UPCOMING_LAUNCHES[0],
      status: 'live' as const,
      statusName: 'Go for Launch',
      isLive: true,
      webcastLive: true,
    };

    render(<HeroSection {...defaultProps} activeLaunch={coverageLaunch} />);

    expect(screen.getAllByText('Coverage live').length).toBeGreaterThan(0);
    expect(screen.queryByText('LIVE NOW')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: coverageLaunch.name })
        .closest('section')
        ?.querySelector('time')
    ).toBeVisible();
  });

  it('uses the supplied detail route for schedule return context', () => {
    const launch = UPCOMING_LAUNCHES[0];
    const detailHref = `/launch/${launch.id}?from=home&schedule=q%3DPolaris`;

    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={launch}
        detailHref={detailHref}
      />
    );

    expect(
      screen.getByRole('link', { name: launch.name })
    ).toHaveAttribute('href', detailHref);
  });

  it('keeps the primary heading mission-first when the vehicle is already telemetry', () => {
    const launch = {
      ...UPCOMING_LAUNCHES[0],
      name: 'Falcon Heavy | Nancy Grace Roman Space Telescope',
      missionName: 'Nancy Grace Roman Space Telescope',
      rocket: 'Falcon Heavy',
    };

    render(<HeroSection {...defaultProps} activeLaunch={launch} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Nancy Grace Roman Space Telescope',
      })
    ).toBeVisible();
    expect(screen.getByText('Falcon Heavy')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: launch.name })
    ).not.toBeInTheDocument();
  });

  it('keeps the provider mission state visible in the primary hero', () => {
    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={{
          ...UPCOMING_LAUNCHES[0],
          statusName: 'Go for Launch',
        }}
      />
    );

    expect(screen.getByText('GO FOR LAUNCH')).toBeVisible();
    expect(screen.getByText('GO')).toBeVisible();
    expect(screen.getByLabelText('GO FOR LAUNCH')).toBeVisible();
  });

  it('does not present a retained provider state as current', () => {
    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={{
          ...UPCOMING_LAUNCHES[0],
          statusName: 'Go for Launch',
        }}
        stale
      />
    );

    expect(screen.getByText('STATUS UNCONFIRMED')).toBeVisible();
    expect(screen.queryByText('GO FOR LAUNCH')).not.toBeInTheDocument();
  });

  it('shows provider attempt ordinals as cadence rather than outcomes', () => {
    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={UPCOMING_LAUNCHES[0]}
      />
    );

    const cadence = screen
      .getByText('Launch cadence · 2035')
      .closest('[data-launch-cadence-signal]');

    expect(cadence).toHaveTextContent('Provider attempt #41');
    expect(cadence).toHaveTextContent('Pad attempt #19');
    expect(cadence).toHaveTextContent('Worldwide orbital #132');
    expect(cadence).not.toHaveTextContent(/success/i);
  });

  it('keeps the provider launch window visible beside the target time', () => {
    const { rerender } = render(
      <HeroSection
        {...defaultProps}
        activeLaunch={UPCOMING_LAUNCHES[0]}
      />
    );

    expect(screen.getByText('Launch window')).toBeVisible();
    expect(screen.getByText('14:30–16:30 UTC')).toBeVisible();

    rerender(
      <HeroSection
        {...defaultProps}
        activeLaunch={UPCOMING_LAUNCHES[1]}
      />
    );
    expect(screen.queryByRole('note', { name: /Launch window/ })).toBeNull();
  });

  it('orients a precise featured target by UTC weekday', () => {
    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={UPCOMING_LAUNCHES[0]}
      />
    );

    expect(screen.getByText('Sat, Jul 28, 2035')).toBeVisible();
  });

  it('keeps provider mission program visible without pushing down the schedule', () => {
    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={UPCOMING_LAUNCHES[0]}
      />
    );

    const profile = screen
      .getByText('Communications')
      .closest('[data-mission-profile-signal]');

    expect(profile).toHaveTextContent('Communications');
    expect(profile).toHaveTextContent('LaunchWatch Test Program');
    expect(
      profile?.querySelector('[aria-label="Program: LaunchWatch Test Program"]'),
    ).toBeVisible();
    expect(profile).not.toHaveTextContent('Low Earth Orbit');
  });

  it('pairs a provider pad identifier with its launch facility', () => {
    render(
      <HeroSection
        {...defaultProps}
        activeLaunch={{
          ...UPCOMING_LAUNCHES[0],
          launchSite: '201',
          location: {
            lat: 19.618452,
            lng: 110.955356,
            name: "Wenchang Space Launch Site, People's Republic of China",
            countryCode: 'CN',
          },
        }}
      />
    );

    expect(screen.getByText('201')).toBeVisible();
    expect(screen.getByText('Wenchang Space Launch Site, China')).toBeVisible();
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

    expect(screen.getByText('Last-known live coverage')).toBeVisible();
    expect(screen.getByText('COVERAGE UNCONFIRMED')).toBeVisible();
    expect(screen.queryByText('LIVE NOW')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: liveLaunch.name }).closest('section')
    ).toHaveClass('signal-warm');
  });
});
