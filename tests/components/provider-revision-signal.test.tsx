import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProviderRevisionSignal, {
  getProviderRevisionLabel,
} from '@/components/launch/ProviderRevisionSignal';

afterEach(() => {
  vi.useRealTimers();
});

describe('ProviderRevisionSignal', () => {
  it('shows relative and absolute UTC provider revision context', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-29T02:00:00.000Z'));

    render(
      <dl>
        <ProviderRevisionSignal updatedAt="2035-07-29T01:13:00.000Z" />
      </dl>,
    );
    act(() => vi.runOnlyPendingTimers());

    const signal = screen
      .getByText('Provider revision')
      .closest('[data-provider-revision-signal]');
    expect(signal).toHaveTextContent('Revised 47m ago');
    expect(signal).toHaveTextContent('Jul 29, 2035 · 01:13 UTC');
    expect(signal?.querySelector('time')).toHaveAttribute(
      'datetime',
      '2035-07-29T01:13:00.000Z',
    );
  });

  it('uses bounded labels for recent, multi-day, and old revisions', () => {
    const now = Date.parse('2035-07-29T02:00:00.000Z');

    expect(
      getProviderRevisionLabel('2035-07-29T01:59:45.000Z', now),
    ).toBe('Revised just now');
    expect(
      getProviderRevisionLabel('2035-07-26T02:00:00.000Z', now),
    ).toBe('Revised 3d ago');
    expect(
      getProviderRevisionLabel('2035-05-01T02:00:00.000Z', now),
    ).toBe('Revised May 1, 2035');
  });

  it('keeps the hero age compact while preserving its full accessible label', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-29T02:00:00.000Z'));

    render(
      <dl>
        <ProviderRevisionSignal
          updatedAt="2035-07-29T01:13:00.000Z"
          variant="hero"
        />
      </dl>,
    );
    act(() => vi.runOnlyPendingTimers());

    const accessibleContext = screen.getByText('Provider revision age:');
    const signal = accessibleContext.closest('[data-provider-revision-signal]');
    expect(signal).not.toBeNull();
    expect(signal).toHaveTextContent('Provider revision age: 47m');
    expect(signal!.querySelector('time')).toHaveAttribute(
      'title',
      'Jul 29, 2035 · 01:13 UTC',
    );
  });

  it('omits missing or malformed provider timestamps', () => {
    const { container, rerender } = render(
      <dl>
        <ProviderRevisionSignal updatedAt={null} />
      </dl>,
    );
    expect(container.querySelector('[data-provider-revision-signal]')).toBeNull();

    rerender(
      <dl>
        <ProviderRevisionSignal updatedAt="not-a-timestamp" />
      </dl>,
    );
    expect(container.querySelector('[data-provider-revision-signal]')).toBeNull();
  });
});
