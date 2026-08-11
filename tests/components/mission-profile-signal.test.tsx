import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MissionProfileSignal from '@/components/launch/MissionProfileSignal';

describe('MissionProfileSignal', () => {
  it('keeps mission type, program, and orbit as distinct provider facts', () => {
    render(
      <dl>
        <MissionProfileSignal
          launch={{
            missionType: 'Human Exploration',
            program: 'Commercial Crew Program',
            orbit: 'Low Earth Orbit',
          }}
        />
      </dl>
    );

    const profile = screen
      .getByText('Mission profile')
      .closest('[data-mission-profile-signal]');

    expect(profile).toHaveTextContent('Human Exploration');
    expect(profile).toHaveTextContent('Program · Commercial Crew Program');
    expect(profile).toHaveTextContent('Orbit · Low Earth Orbit');
  });

  it('does not repeat a provider value used as the primary profile', () => {
    render(
      <dl>
        <MissionProfileSignal
          launch={{
            missionType: null,
            program: 'Low Earth Orbit',
            orbit: 'low earth orbit',
          }}
        />
      </dl>
    );

    expect(screen.getAllByText(/low earth orbit/i)).toHaveLength(1);
    expect(screen.queryByText(/Program ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Orbit ·/)).not.toBeInTheDocument();
  });

  it('uses an honest pending state for placeholder-only provider context', () => {
    render(
      <dl>
        <MissionProfileSignal
          launch={{ missionType: 'N/A', program: null, orbit: 'Unknown' }}
        />
      </dl>
    );

    expect(screen.getByText('Profile pending')).toBeVisible();
    expect(screen.queryByText(/Program ·|Orbit ·/)).not.toBeInTheDocument();
  });
});
