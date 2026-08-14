import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders a cautious coverage label without an in-flight provider state', () => {
    render(<StatusBadge status="live" />);

    expect(screen.getByText('COVERAGE LIVE')).toHaveClass(
      'text-[var(--console-magenta)]'
    );
  });

  it('reserves the in-flight label for an explicit provider mission state', () => {
    render(<StatusBadge status="live" statusName="In Flight" />);

    expect(screen.getByText('IN FLIGHT')).toHaveClass(
      'text-[var(--console-magenta)]'
    );
  });

  it('replaces a retained live claim with an amber unconfirmed state', () => {
    render(<StatusBadge status="live" statusName="Live" unconfirmed />);

    expect(screen.getByText('STATUS UNCONFIRMED')).toHaveClass(
      'text-[var(--console-amber)]'
    );
    expect(screen.queryByText('COVERAGE LIVE')).not.toBeInTheDocument();
  });

  it('does not claim a generic scheduled mission is go for launch', () => {
    render(<StatusBadge status="upcoming" />);

    expect(screen.getByText('SCHEDULED')).toBeVisible();
    expect(screen.queryByText('GO FOR LAUNCH')).not.toBeInTheDocument();
  });

  it('uses provider status text for a scheduled mission', () => {
    render(<StatusBadge status="upcoming" statusName="Window confirmed" />);

    expect(screen.getByText('WINDOW CONFIRMED')).toBeVisible();
  });

  it('reserves the critical signal for provider-reported holds', () => {
    render(<StatusBadge status="tbd" statusName="Hold" />);

    expect(screen.getByText('HOLD')).toHaveClass(
      'text-[var(--console-red)]'
    );
  });

  it('supports a compact text-first signal for dense mission controls', () => {
    render(
      <StatusBadge
        status="tbd"
        statusName="On Hold"
        variant="inline"
      />
    );

    const status = screen.getByText('ON HOLD');
    expect(status).toHaveClass('text-[var(--console-red)]');
    expect(status).not.toHaveClass('border');
  });

  it('keeps one valid accessible label while its visual text adapts', () => {
    const { container } = render(
      <StatusBadge
        status="upcoming"
        statusName="Go for Launch"
        compactLabel="GO"
      />
    );

    const badge = container.firstElementChild;
    expect(badge).not.toHaveAttribute('aria-label');
    expect(
      screen.getByText('GO FOR LAUNCH', { selector: '.sr-only' })
    ).toBeInTheDocument();
    expect(screen.getByText('GO')).toHaveAttribute('aria-hidden', 'true');
    expect(
      screen.getAllByText('GO FOR LAUNCH').find((element) =>
        element.classList.contains('sm:inline')
      )
    ).toHaveAttribute('aria-hidden', 'true');
  });
});
