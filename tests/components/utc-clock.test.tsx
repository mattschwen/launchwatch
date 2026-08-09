import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UTCClock from '@/components/ui/UTCClock';

vi.mock('@/lib/hooks', () => ({
  useCurrentTime: () => Date.parse('2035-07-28T14:30:45.000Z'),
}));

describe('UTCClock', () => {
  it('keeps compact mission time visibly short and explicitly named', () => {
    render(
      <UTCClock compact showIndicator={false} showLabel={false} />
    );

    const time = screen.getByLabelText('Current UTC time 14:30:45');
    expect(time).toHaveTextContent('14:30Z');
    expect(time).toHaveAttribute('datetime', '2035-07-28T14:30:45.000Z');
    expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
