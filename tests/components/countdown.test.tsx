import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Countdown from '@/components/Countdown';
import { useCountdown } from '@/lib/hooks';

vi.mock('@/lib/hooks', () => ({
  useCountdown: vi.fn(),
}));

const mockedUseCountdown = vi.mocked(useCountdown);

describe('Countdown', () => {
  beforeEach(() => {
    mockedUseCountdown.mockReturnValue({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      total: 183845,
      now: Date.now(),
    });
  });

  it('renders an accessible four-cell mission display', () => {
    const { container } = render(
      <Countdown targetDate="2035-07-28T14:30:00.000Z" />
    );

    const spokenCountdown = screen.getByText(
      '2 days, 3 hours, 4 minutes, 5 seconds until launch'
    );
    const time = spokenCountdown.closest('time');
    const display = container.querySelector('.countdown-display');
    const units = container.querySelectorAll('.countdown-unit');

    expect(spokenCountdown).toHaveClass('sr-only', 'countdown-spoken');
    expect(time?.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2035-07-28T14:30:00.000Z');
    expect(time).not.toHaveAttribute('aria-label');
    expect(display).toBeInTheDocument();
    expect(display).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.countdown-prefix')).toHaveTextContent('T−');
    expect(units).toHaveLength(4);
    expect(
      [...container.querySelectorAll('.countdown-digits')].map(
        (element) => element.textContent
      )
    ).toEqual(['02', '03', '04', '05']);
    expect(
      [...container.querySelectorAll('.countdown-unit-label')].map(
        (element) => element.textContent
      )
    ).toEqual(['days', 'hrs', 'min', 'sec']);
  });

  it('preserves three-digit mission days without truncating the value', () => {
    mockedUseCountdown.mockReturnValue({
      days: 123,
      hours: 9,
      minutes: 8,
      seconds: 7,
      total: 10660087,
      now: Date.now(),
    });

    const { container } = render(
      <Countdown targetDate="2036-01-01T00:00:00.000Z" featured />
    );

    expect(
      container.querySelector('.countdown-digits')
    ).toHaveTextContent('123');
    expect(container.querySelector('.countdown-display')).toHaveClass(
      'grid-cols-[auto_minmax(3ch,1.2fr)_repeat(3,minmax(2ch,1fr))]'
    );
  });

  it('keeps compact shorthand visual while exposing the full countdown', () => {
    const { container } = render(
      <Countdown targetDate="2035-07-28T14:30:00.000Z" compact />
    );

    expect(screen.getByText('T−2d 03h')).toBeVisible();
    expect(screen.getByText(
      '2 days, 3 hours, 4 minutes, 5 seconds until launch'
    )).toHaveClass('sr-only', 'countdown-spoken');
    expect(screen.getByText('T−2d 03h')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(container.querySelector('.countdown-display')).not.toBeInTheDocument();
  });

  it('uses singular countdown units when each value is one', () => {
    mockedUseCountdown.mockReturnValue({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
      total: 90061,
      now: Date.now(),
    });

    render(<Countdown targetDate="2035-07-28T14:30:00.000Z" />);

    expect(
      screen.getByText('1 day, 1 hour, 1 minute, 1 second until launch')
    ).toHaveClass('sr-only', 'countdown-spoken');
  });

  it('does not claim an unconfirmed launch window after the target passes', () => {
    mockedUseCountdown.mockReturnValue({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      now: Date.now(),
    });

    render(<Countdown targetDate="2035-07-28T14:30:00.000Z" compact />);

    expect(
      screen.getByRole('status', { name: 'Awaiting provider update' })
    ).toHaveClass('text-[var(--console-amber)]');
    expect(screen.queryByText('Window open')).not.toBeInTheDocument();
  });

  it('identifies a confirmed provider window that remains open', () => {
    mockedUseCountdown.mockReturnValue({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      now: Date.now(),
    });
    const target = new Date(Date.now() - 60_000);

    render(
      <Countdown
        targetDate={target.toISOString()}
        windowStart={new Date(target.getTime() - 30 * 60_000).toISOString()}
        windowEnd={new Date(Date.now() + 30 * 60_000).toISOString()}
      />
    );

    expect(
      screen.getByRole('status', { name: 'Launch window open' })
    ).toHaveClass('text-[var(--console-green)]');
  });

  it('stops calling a validated provider window open after its end', () => {
    mockedUseCountdown.mockReturnValue({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      now: Date.now(),
    });
    const target = new Date(Date.now() - 60 * 60_000);

    render(
      <Countdown
        targetDate={target.toISOString()}
        windowStart={new Date(target.getTime() - 30 * 60_000).toISOString()}
        windowEnd={new Date(Date.now() - 30 * 60_000).toISOString()}
      />
    );

    expect(
      screen.getByRole('status', { name: 'Awaiting provider update' })
    ).toHaveAttribute('data-countdown-state', 'awaiting-provider');
  });

  it('shows a stable estimate instead of a false countdown for coarse dates', () => {
    const { container } = render(
      <Countdown
        targetDate="2035-08-31T00:00:00.000Z"
        precision={{ name: 'Month', abbrev: 'M' }}
        featured
      />
    );

    expect(screen.getByText('August 2035')).toBeVisible();
    expect(screen.getByText(/Month estimate · countdown begins/)).toBeVisible();
    expect(
      screen.getByText(
        'Estimated launch target: August 2035. Month estimate.'
      )
    ).toHaveClass('sr-only', 'countdown-spoken');
    expect(container.querySelector('.countdown-display')).not.toBeInTheDocument();
  });

  it.each([
    [{ name: 'Minute', abbrev: 'MIN' }, 'Minute estimate'],
    [{ name: 'Hour', abbrev: 'HR' }, 'Hour estimate'],
  ])(
    'renders a live, precision-aware %s countdown',
    (precision, label) => {
      const { container } = render(
        <Countdown
          targetDate="2035-07-28T14:30:00.000Z"
          precision={precision}
          featured
        />
      );

      expect(
        screen.getByText(
          `Estimated countdown: 2 days, 3 hours, 4 minutes, 5 seconds until the provider target. ${label}.`
        )
      ).toHaveClass('sr-only', 'countdown-spoken');
      expect(container.querySelector('.countdown-prefix')).toHaveTextContent(
        '≈T−'
      );
      expect(container.querySelectorAll('.countdown-unit')).toHaveLength(4);
      expect(
        [...container.querySelectorAll('.countdown-digits')].map(
          (element) => element.textContent
        )
      ).toEqual(['02', '03', '04', '05']);
      expect(container.querySelectorAll('.countdown-digit-tick')).toHaveLength(4);
      expect(screen.getByText(`${label} · provider target may move`)).toBeVisible();
      expect(container.querySelector('.countdown-display')).toBeInTheDocument();
    }
  );

  it.each([
    [{ name: 'Minute', abbrev: 'MIN' }, 'Minute estimate'],
    [{ name: 'Hour', abbrev: 'HR' }, 'Hour estimate'],
  ])(
    'keeps a compact approximate countdown for %s targets',
    (precision, label) => {
      render(
        <Countdown
          targetDate="2035-07-28T14:30:00.000Z"
          precision={precision}
          compact
        />
      );

      const spokenCountdown = screen.getByText(
        `Estimated countdown: 2 days, 3 hours, 4 minutes, 5 seconds until the provider target. ${label}.`
      );
      expect(spokenCountdown).toHaveClass('sr-only', 'countdown-spoken');
      expect(spokenCountdown.closest('time')).not.toHaveAttribute('aria-label');
      expect(screen.getByText(`≈T−2d 03:04:05 · ${label}`)).toBeVisible();
      expect(screen.getByText(/≈T−/)).toHaveClass('countdown-compact-tick');
    }
  );
});
