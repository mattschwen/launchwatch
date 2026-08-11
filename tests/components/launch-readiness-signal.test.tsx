import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LaunchReadinessSignal from '@/components/launch/LaunchReadinessSignal';

describe('LaunchReadinessSignal', () => {
  it('keeps probability, weather constraints, and provider holds distinct', () => {
    render(
      <dl>
        <LaunchReadinessSignal
          launch={{
            launchProbability: 85,
            weatherConcerns: 'Cumulus Cloud Rule',
            holdReason: 'Range clearance pending',
          }}
        />
      </dl>
    );

    const readiness = screen
      .getByText('Launch readiness')
      .closest('[data-launch-readiness-signal]');

    expect(readiness).toHaveTextContent('85% provider probability');
    expect(readiness).toHaveTextContent('Weather · Cumulus Cloud Rule');
    expect(readiness).toHaveTextContent('Hold · Range clearance pending');
  });

  it('renders a provider constraint without inventing a probability', () => {
    render(
      <dl>
        <LaunchReadinessSignal
          launch={{
            launchProbability: null,
            weatherConcerns: 'Anvil Cloud Rule',
            holdReason: null,
          }}
        />
      </dl>
    );

    expect(screen.getByText('Provider constraint reported')).toBeVisible();
    expect(screen.queryByText(/% provider probability/)).not.toBeInTheDocument();
  });

  it('omits readiness when the provider supplied no facts', () => {
    const { container } = render(
      <dl>
        <LaunchReadinessSignal
          launch={{
            launchProbability: null,
            weatherConcerns: 'Unknown',
            holdReason: 'N/A',
          }}
        />
      </dl>
    );

    expect(container.querySelector('[data-launch-readiness-signal]')).toBeNull();
  });
});
