import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProviderStatusSignal from '@/components/launch/ProviderStatusSignal';

describe('ProviderStatusSignal', () => {
  it('explains the named provider state in mission telemetry', () => {
    render(
      <dl>
        <ProviderStatusSignal
          launch={{
            statusName: 'To Be Determined',
            statusDescription:
              'Current date is a placeholder or rough estimation based on unreliable or interpreted sources.',
          }}
          variant="compact"
        />
      </dl>,
    );

    expect(screen.getByText('Provider status')).toBeInTheDocument();
    expect(screen.getByText('To Be Determined')).toBeInTheDocument();
    expect(
      screen.getByText(/current date is a placeholder/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Provider status').closest('[data-provider-status-signal]'),
    ).toHaveClass('mission-telemetry-item');
  });

  it('stays absent when the provider supplies no meaningful explanation', () => {
    const { container } = render(
      <dl>
        <ProviderStatusSignal
          launch={{ statusName: 'Go for Launch', statusDescription: null }}
        />
      </dl>,
    );

    expect(container.querySelector('[data-provider-status-signal]')).toBeNull();
  });
});
