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

    expect(spokenCountdown).toHaveClass('sr-only');
    expect(time?.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2035-07-28T14:30:00.000Z');
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

  it('keeps the compact countdown format unchanged', () => {
    const { container } = render(
      <Countdown targetDate="2035-07-28T14:30:00.000Z" compact />
    );

    expect(screen.getByText('T−2d 03h')).toBeVisible();
    expect(container.querySelector('.countdown-display')).not.toBeInTheDocument();
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
    ).toHaveClass('sr-only');
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
      ).toBeVisible();
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
      expect(spokenCountdown).toHaveClass('sr-only');
      expect(spokenCountdown.closest('time')).not.toHaveAttribute('aria-label');
      expect(screen.getByText(`≈T−2d 03:04:05 · ${label}`)).toBeVisible();
      expect(screen.getByText(/≈T−/)).toHaveClass('countdown-compact-tick');
    }
  );
});
