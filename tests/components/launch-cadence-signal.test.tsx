import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LaunchCadenceSignal from '@/components/launch/LaunchCadenceSignal';

describe('LaunchCadenceSignal', () => {
  it('labels provider, pad, and worldwide attempt sequence without implying outcomes', () => {
    render(
      <dl>
        <LaunchCadenceSignal
          launch={{
            date: '2035-07-28T14:30:00.000Z',
            providerLaunchAttemptCountYear: 41,
            padLaunchAttemptCountYear: 19,
            orbitalLaunchAttemptCountYear: 132,
          }}
        />
      </dl>,
    );

    expect(screen.getByText('Launch cadence · 2035')).toBeVisible();
    expect(
      screen.getByText('Launch provider attempt number 41 in 2035'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Launch pad attempt number 19 in 2035'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Worldwide orbital launch attempt number 132 in 2035',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/successful/i)).not.toBeInTheDocument();
  });

  it('renders available counts independently and omits an empty signal', () => {
    const { rerender, container } = render(
      <dl>
        <LaunchCadenceSignal
          launch={{
            date: '2035-07-28T14:30:00.000Z',
            providerLaunchAttemptCountYear: null,
            padLaunchAttemptCountYear: 19,
            orbitalLaunchAttemptCountYear: null,
          }}
        />
      </dl>,
    );

    expect(screen.getByText('Pad attempt')).toBeVisible();
    expect(screen.queryByText('Provider attempt')).not.toBeInTheDocument();

    rerender(
      <dl>
        <LaunchCadenceSignal
          launch={{
            date: '2035-07-28T14:30:00.000Z',
            providerLaunchAttemptCountYear: 0,
            padLaunchAttemptCountYear: null,
            orbitalLaunchAttemptCountYear: undefined,
          }}
        />
      </dl>,
    );

    expect(container.querySelector('[data-launch-cadence-signal]')).toBeNull();
  });
});
