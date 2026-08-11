import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MissionOperatorSignal from '@/components/launch/MissionOperatorSignal';

describe('MissionOperatorSignal', () => {
  it('keeps distinct provider operators and agency types visible', () => {
    render(
      <dl>
        <MissionOperatorSignal
          missionAgencies={[
            {
              name: 'National Aeronautics and Space Administration',
              abbrev: 'NASA',
              type: 'Government',
            },
            {
              name: 'European Space Agency',
              abbrev: 'ESA',
              type: 'Multinational',
            },
          ]}
        />
      </dl>,
    );

    const signal = screen
      .getByText('Mission operators')
      .closest('[data-mission-operator-signal]');

    expect(signal).toHaveTextContent(
      'National Aeronautics and Space Administration (NASA)',
    );
    expect(signal).toHaveTextContent('European Space Agency (ESA)');
    expect(signal).toHaveTextContent('Government');
    expect(signal).toHaveTextContent('Multinational');
  });

  it('omits placeholder-only provider operators', () => {
    const { container } = render(
      <dl>
        <MissionOperatorSignal
          missionAgencies={[
            { name: 'N/A', abbrev: null, type: null },
            { name: 'Unknown', abbrev: 'TBD', type: 'Unknown' },
          ]}
        />
      </dl>,
    );

    expect(container.querySelector('[data-mission-operator-signal]')).toBeNull();
  });
});
