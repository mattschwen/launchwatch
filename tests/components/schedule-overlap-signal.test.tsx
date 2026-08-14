import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ScheduleOverlapSignal from '@/components/launch/ScheduleOverlapSignal';
import { getLaunchWindowOverlaps } from '@/lib/schedule-overlap';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function planningOverlaps() {
  const first = {
    ...UPCOMING_LAUNCHES[0],
    missionName: 'Orbital Dawn',
    windowStart: '2035-07-28T14:30:00.000Z',
    windowEnd: '2035-07-28T16:30:00.000Z',
  };
  const second = {
    ...UPCOMING_LAUNCHES[1],
    missionName: 'Polaris Relay',
    date: '2035-07-28T16:00:00.000Z',
    dateUnix: 2069251200,
    windowStart: '2035-07-28T16:00:00.000Z',
    windowEnd: '2035-07-28T16:15:00.000Z',
  };
  const third = {
    ...UPCOMING_LAUNCHES[1],
    id: 'spacex-demo-lunar-pathfinder',
    sourceId: 'demo-lunar-pathfinder',
    name: 'Electron | Lunar Pathfinder',
    missionName: 'Lunar Pathfinder',
    provider: 'Rocket Lab',
    date: '2035-07-28T16:05:00.000Z',
    dateUnix: 2069251500,
    windowStart: '2035-07-28T16:05:00.000Z',
    windowEnd: '2035-07-28T16:45:00.000Z',
  };

  return getLaunchWindowOverlaps([first, second, third]);
}

describe('ScheduleOverlapSignal', () => {
  it('reveals every later overlap while keeping the nearest conflict primary', async () => {
    const user = userEvent.setup();
    const overlaps = planningOverlaps();
    render(<ScheduleOverlapSignal overlaps={overlaps} state="current" />);

    const primary = screen.getByRole('status', {
      name: /Concurrent provider launch windows/,
    });
    expect(primary).toHaveAccessibleName(/15 min overlap/);
    expect(primary).toHaveAccessibleName(/2 later overlaps/);
    expect(primary).toHaveTextContent('Orbital Dawn');
    expect(primary).toHaveTextContent('Polaris Relay');

    const disclosure = screen.getByRole('button', {
      name: 'Show 2 later overlaps',
    });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('list', {
        name: 'Later concurrent provider launch windows',
      }),
    ).not.toBeInTheDocument();

    disclosure.focus();
    await user.keyboard('{Enter}');

    expect(disclosure).toHaveFocus();
    expect(disclosure).toHaveAccessibleName('Hide 2 later overlaps');
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    const later = screen.getByRole('list', {
      name: 'Later concurrent provider launch windows',
    });
    expect(within(later).getAllByRole('listitem')).toHaveLength(2);
    expect(later).toHaveTextContent('25 min overlap');
    expect(later).toHaveTextContent('Lunar Pathfinder');
    expect(later).toHaveTextContent('10 min overlap');
    expect(later.querySelectorAll('time')).toHaveLength(4);

    await user.keyboard('{Enter}');
    expect(disclosure).toHaveAccessibleName('Show 2 later overlaps');
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(disclosure).toHaveFocus();
  });

  it('keeps a lone retained conflict qualified without an empty disclosure', () => {
    render(
      <ScheduleOverlapSignal
        overlaps={planningOverlaps().slice(0, 1)}
        state="retained"
      />,
    );

    expect(
      screen.getByRole('status', {
        name: /Last-known planning signal/,
      }),
    ).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
