import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TimelineEventClock from '@/components/TimelineEventClock';

describe('TimelineEventClock', () => {
  it('shows the provider-derived UTC clock and machine-readable event time', () => {
    render(
      <TimelineEventClock
        launchDate="2035-07-28T14:30:00.000Z"
        relativeTime="-P0DT2H35M"
      />
    );

    const clock = screen.getByText('11:55 UTC');
    expect(clock).toHaveAttribute('datetime', '2035-07-28T11:55:00.000Z');
    expect(screen.queryByText('Estimated event time')).not.toBeInTheDocument();
  });

  it('labels clocks derived from a minute estimate and hides coarse clocks', () => {
    const view = render(
      <TimelineEventClock
        launchDate="2035-07-28T14:30:00.000Z"
        precision={{ name: 'Minute', abbrev: 'MIN' }}
        relativeTime="T+00:54:12"
      />
    );

    expect(screen.getByText('Estimated event time')).toBeInTheDocument();
    expect(screen.getByText('15:24 UTC')).toBeVisible();

    view.rerender(
      <TimelineEventClock
        launchDate="2035-07-28T14:30:00.000Z"
        precision={{ name: 'Hour', abbrev: 'HR' }}
        relativeTime="T+00:54:12"
      />
    );
    expect(screen.queryByText('15:24 UTC')).not.toBeInTheDocument();
  });
});
