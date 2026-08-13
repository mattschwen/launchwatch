import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoverageTimingSignal, {
  getCoverageTiming,
} from '@/components/launch/CoverageTimingSignal';
import { UPCOMING_LAUNCHES } from '@/tests/fixtures/launches';

const launch = {
  ...UPCOMING_LAUNCHES[0],
  livestream: 'https://x.com/i/broadcasts/orbital-dawn',
  livestreams: [
    {
      url: 'https://x.com/i/broadcasts/orbital-dawn',
      title: 'Orbital Dawn official coverage',
      startTime: '2035-07-28T14:10:00.000Z',
      isLive: false,
    },
  ],
};

describe('CoverageTimingSignal', () => {
  it('shows the primary provider stream time relative to the launch target', () => {
    render(<CoverageTimingSignal launch={launch} />);

    const signal = screen.getByRole('group', {
      name: 'Provider coverage schedule',
    });
    expect(signal).toHaveTextContent('Provider coverage start');
    expect(signal).toHaveTextContent('20m before provider launch target');
    expect(signal.querySelector('time')).toHaveAttribute(
      'datetime',
      '2035-07-28T14:10:00.000Z',
    );
  });

  it('uses only timing attached to the selected primary stream', () => {
    expect(
      getCoverageTiming({
        ...launch,
        livestream: 'https://www.youtube.com/watch?v=other-stream',
      }),
    ).toBeNull();
  });

  it('does not present a scheduled start as current or completed coverage', () => {
    const { rerender } = render(
      <CoverageTimingSignal launch={{ ...launch, isLive: true }} />,
    );
    expect(
      screen.queryByRole('group', { name: 'Provider coverage schedule' }),
    ).not.toBeInTheDocument();

    rerender(
      <CoverageTimingSignal launch={{ ...launch, status: 'success' }} />,
    );
    expect(
      screen.queryByRole('group', { name: 'Provider coverage schedule' }),
    ).not.toBeInTheDocument();
  });
});
