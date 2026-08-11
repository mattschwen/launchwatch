import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LaunchTimeContext from '@/components/LaunchTimeContext';
import { UPCOMING_LAUNCHES } from '@/tests/fixtures/launches';

describe('LaunchTimeContext', () => {
  it('adds the site clock beside a distinct viewer clock', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Denver',
      hourCycle: 'h12',
      hour12: true,
    });

    render(<LaunchTimeContext launch={UPCOMING_LAUNCHES[0]} />);

    expect(screen.getByText('Site time')).toBeVisible();
    expect(screen.getByText('10:30 AM EDT')).toHaveAttribute(
      'datetime',
      UPCOMING_LAUNCHES[0].date,
    );
    expect(screen.getByText('Your time')).toBeVisible();
    expect(screen.getByText('8:30 AM MDT')).toBeVisible();
  });

  it('shows the site clock once when the viewer is at the launch site', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/New_York',
      hourCycle: 'h12',
      hour12: true,
    });

    render(<LaunchTimeContext launch={UPCOMING_LAUNCHES[0]} />);

    expect(screen.getByText('Site time')).toBeVisible();
    expect(screen.queryByText('Your time')).not.toBeInTheDocument();
  });

  it('falls back to viewer time when no site time zone is available', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Denver',
      hourCycle: 'h12',
      hour12: true,
    });

    render(
      <LaunchTimeContext
        launch={{ ...UPCOMING_LAUNCHES[0], location: null }}
      />,
    );

    expect(screen.queryByText('Site time')).not.toBeInTheDocument();
    expect(screen.getByText('Your time')).toBeVisible();
  });
});
