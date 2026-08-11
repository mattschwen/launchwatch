import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LocalLaunchTime from '@/components/LocalLaunchTime';

describe('LocalLaunchTime', () => {
  it('labels an exact target in the browser time zone', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Denver',
      hourCycle: 'h12',
      hour12: true,
    });

    render(<LocalLaunchTime date="2035-07-28T14:30:00.000Z" />);

    expect(screen.getByText('Your time')).toBeVisible();
    expect(screen.getByText('8:30 AM MDT')).toHaveAttribute(
      'datetime',
      '2035-07-28T14:30:00.000Z'
    );
  });

  it('stays absent for UTC users and coarse provider targets', () => {
    const resolvedOptions = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn',
        timeZone: 'UTC',
        hourCycle: 'h12',
        hour12: true,
      });
    const { rerender } = render(
      <LocalLaunchTime date="2035-07-28T14:30:00.000Z" />
    );
    expect(screen.queryByText('Your time')).not.toBeInTheDocument();

    resolvedOptions.mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Denver',
      hourCycle: 'h12',
      hour12: true,
    });
    rerender(
      <LocalLaunchTime
        date="2035-07-28T14:30:00.000Z"
        precision={{ name: 'Day', abbrev: 'DAY' }}
      />
    );
    expect(screen.queryByText('Your time')).not.toBeInTheDocument();
  });

  it('does not repeat the launch-site time zone', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/New_York',
      hourCycle: 'h12',
      hour12: true,
    });

    render(
      <LocalLaunchTime
        date="2035-07-28T14:30:00.000Z"
        excludeTimeZone="America/New_York"
      />
    );

    expect(screen.queryByText('Your time')).not.toBeInTheDocument();
  });
});
