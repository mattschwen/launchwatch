import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders a clear live label', () => {
    render(<StatusBadge status="live" />);

    expect(screen.getByText('LIVE')).toBeVisible();
  });

  it('uses provider status text for a scheduled mission', () => {
    render(<StatusBadge status="upcoming" statusName="Window confirmed" />);

    expect(screen.getByText('WINDOW CONFIRMED')).toBeVisible();
  });
});
