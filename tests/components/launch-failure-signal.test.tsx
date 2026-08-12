import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LaunchFailureSignal from '@/components/launch/LaunchFailureSignal';

describe('LaunchFailureSignal', () => {
  it('shows the provider diagnosis for a failed mission', () => {
    render(
      <LaunchFailureSignal
        launch={{
          status: 'failure',
          failureReason: 'Vehicle lost during ascent.',
        }}
      />,
    );

    expect(
      screen.getByRole('note', {
        name: 'Provider failure report: Vehicle lost during ascent.',
      }),
    ).toHaveTextContent('Vehicle lost during ascent.');
  });

  it('does not surface stale or placeholder failure text', () => {
    const { rerender } = render(
      <LaunchFailureSignal
        launch={{
          status: 'success',
          failureReason: 'Stale provider diagnosis.',
        }}
      />,
    );

    expect(
      screen.queryByText('Provider failure report'),
    ).not.toBeInTheDocument();

    rerender(
      <LaunchFailureSignal
        launch={{ status: 'failure', failureReason: 'Unknown' }}
      />,
    );
    expect(
      screen.queryByText('Provider failure report'),
    ).not.toBeInTheDocument();
  });

  it('uses a valid definition group inside compact telemetry', () => {
    const { container } = render(
      <dl>
        <LaunchFailureSignal
          compact
          launch={{
            status: 'failure',
            failureReason: 'Vehicle lost during ascent.',
          }}
        />
      </dl>,
    );

    const signal = container.querySelector('[data-launch-failure-signal]');
    expect(signal?.querySelector('dt')).toHaveTextContent(
      'Provider failure report',
    );
    expect(signal?.querySelector('dd')).toHaveTextContent(
      'Vehicle lost during ascent.',
    );
    expect(signal).not.toHaveAttribute('role');
  });
});
