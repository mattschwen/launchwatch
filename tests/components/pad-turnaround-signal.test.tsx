import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PadTurnaroundSignal, {
  formatPadTurnaround,
} from '@/components/launch/PadTurnaroundSignal';

describe('PadTurnaroundSignal', () => {
  it('explains a provider duration without implying maintenance or readiness', () => {
    render(
      <dl>
        <PadTurnaroundSignal seconds={3 * 86_400 + 17 * 3_600 + 6 * 60} />
      </dl>,
    );

    expect(screen.getByText('Pad turnaround')).toBeVisible();
    expect(screen.getByText('3d 17h')).toBeVisible();
    expect(
      screen.getByText('Since the previous launch from this pad'),
    ).toBeVisible();
    expect(screen.queryByText(/ready|maintenance/i)).not.toBeInTheDocument();
  });

  it('formats sub-day durations and omits malformed values', () => {
    expect(formatPadTurnaround(4 * 3_600 + 9 * 60)).toBe('4h 9m');
    expect(formatPadTurnaround(42)).toBe('<1m');
    expect(formatPadTurnaround(0)).toBeNull();

    const { container } = render(
      <dl>
        <PadTurnaroundSignal seconds={null} compact />
      </dl>,
    );
    expect(container.querySelector('[data-pad-turnaround-signal]')).toBeNull();
  });
});
