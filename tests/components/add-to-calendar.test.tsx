import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AddToCalendar from '@/components/AddToCalendar';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AddToCalendar', () => {
  it('reports a denied clipboard write and supports a focused retry', async () => {
    const user = userEvent.setup();
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Permission denied'))
      .mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<AddToCalendar launch={UPCOMING_LAUNCHES[0]} />);

    await user.click(
      screen.getByRole('button', { name: 'Add to calendar' })
    );
    const copy = screen.getByRole('button', {
      name: 'Copy launch details',
    });
    await user.click(copy);

    expect(
      await screen.findByRole('button', { name: 'Copy failed — try again' })
    ).toHaveFocus();
    expect(copy).not.toBeDisabled();
    expect(copy).toHaveAttribute('aria-disabled', 'false');
    expect(copy).toHaveAttribute('aria-busy', 'false');
    expect(
      screen.getByText(
        'Could not copy launch details. Try again or use a calendar option.'
      )
    ).toBeInTheDocument();

    await user.click(copy);

    expect(
      await screen.findByRole('button', { name: 'Details copied' })
    ).toHaveFocus();
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText('Launch details copied to clipboard')
    ).toBeInTheDocument();
  });
});
