import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LocalLaunchTime from '@/components/LocalLaunchTime';
import LocalLaunchWindow from '@/components/LocalLaunchWindow';
import { UPCOMING_LAUNCHES } from '@/tests/fixtures/launches';

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

describe('LocalLaunchWindow', () => {
  it('switches between viewer and launch-site windows without adding another row', async () => {
    const user = userEvent.setup();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Denver',
      hourCycle: 'h12',
      hour12: true,
    });

    render(<LocalLaunchWindow launch={UPCOMING_LAUNCHES[0]} />);

    const window = screen.getByRole('note', {
      name: 'Your window 8:30 AM–10:30 AM MDT',
    });
    const showSite = screen.getByRole('button', {
      name: 'Show launch site window 10:30 AM–12:30 PM EDT',
    });
    expect(window).toBeVisible();
    expect(screen.queryByText('10:30 AM–12:30 PM EDT')).toBeNull();

    await user.click(showSite);

    expect(window).toHaveAccessibleName(
      'Site window 10:30 AM–12:30 PM EDT',
    );
    expect(showSite).toHaveAccessibleName(
      'Show your window 8:30 AM–10:30 AM MDT',
    );
    expect(showSite).toHaveFocus();
    expect(showSite).not.toHaveClass('-my-1');
    expect(showSite).toHaveClass('min-[360px]:-my-1');
    expect(window).toHaveClass('items-center', 'gap-y-1');
  });

  it('does not duplicate the window when the viewer is at the launch site', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/New_York',
      hourCycle: 'h12',
      hour12: true,
    });

    render(<LocalLaunchWindow launch={UPCOMING_LAUNCHES[0]} />);

    expect(
      screen.getByRole('note', { name: /Site window/ })
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Show your window/ })
    ).not.toBeInTheDocument();
  });

  it('does not duplicate equivalent site and viewer time-zone aliases', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'America/Detroit',
      hourCycle: 'h12',
      hour12: true,
    });

    render(<LocalLaunchWindow launch={UPCOMING_LAUNCHES[0]} />);

    expect(
      screen.getByRole('note', { name: /Site window/ })
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Show your window/ })
    ).not.toBeInTheDocument();
  });
});
