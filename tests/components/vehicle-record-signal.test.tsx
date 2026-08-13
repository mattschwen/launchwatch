import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VehicleRecordSignal from '@/components/launch/VehicleRecordSignal';

describe('VehicleRecordSignal', () => {
  it('presents configuration history without implying mission odds', () => {
    render(
      <dl>
        <VehicleRecordSignal
          record={{
            maidenFlight: '2018-05-11',
            totalLaunchCount: 620,
            successfulLaunches: 619,
            failedLaunches: 1,
          }}
        />
      </dl>,
    );

    expect(screen.getByText('Vehicle record')).toBeVisible();
    expect(screen.getByText('620 provider-recorded flights')).toBeVisible();
    expect(screen.getByText('619 successful')).toBeVisible();
    expect(screen.getByText('1 failed')).toBeVisible();
    expect(
      screen.getByText(
        'Configuration first flew May 11, 2018. Historical provider record — not a forecast for this mission.',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/probability|odds|reliability/i)).not.toBeInTheDocument();
  });

  it('honestly represents a new configuration and omits an absent record', () => {
    const { rerender, container } = render(
      <dl>
        <VehicleRecordSignal
          record={{
            maidenFlight: null,
            totalLaunchCount: 0,
            successfulLaunches: 0,
            failedLaunches: 0,
          }}
          compact
        />
      </dl>,
    );

    expect(screen.getByText('No completed flights recorded')).toBeVisible();
    expect(screen.queryByText(/successful|failed/)).not.toBeInTheDocument();

    rerender(<dl><VehicleRecordSignal record={null} /></dl>);
    expect(container.querySelector('[data-vehicle-record-signal]')).toBeNull();
  });
});
