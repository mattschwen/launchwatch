import { describe, expect, it } from 'vitest';
import {
  buildHistoryDetailHref,
  buildHistoryReturnHref,
  DEFAULT_HISTORY_FILTERS,
  parseHistoryFilters,
  readHistoryReturnFocus,
  readHistoryReturnQuery,
  serializeHistoryFilters,
} from '@/lib/history-return';

describe('history return context', () => {
  it('serializes only bounded active filters', () => {
    const filters = parseHistoryFilters({
      q: '  Return  ',
      provider: 'SpaceX',
      year: '2025',
      outcome: 'success',
    });

    expect(filters).toEqual({
      search: 'Return',
      provider: 'SpaceX',
      year: '2025',
      outcome: 'success',
      sortBy: 'date-desc',
    });
    expect(serializeHistoryFilters(filters)).toBe(
      'q=Return&provider=SpaceX&year=2025&outcome=success',
    );
  });

  it('rejects duplicate, malformed, and oversized values', () => {
    expect(
      parseHistoryFilters(
        new URLSearchParams(
          'q=first&q=second&provider=SpaceX&year=twenty&outcome=unknown',
        ),
      ),
    ).toEqual({
      ...DEFAULT_HISTORY_FILTERS,
      provider: 'SpaceX',
    });
    expect(readHistoryReturnQuery(`q=${'x'.repeat(601)}`)).toBeNull();
  });

  it('creates only internal archive return destinations', () => {
    expect(
      buildHistoryDetailHref('spacex/demo', DEFAULT_HISTORY_FILTERS),
    ).toBe('/launch/spacex%2Fdemo?from=history');

    const href = buildHistoryDetailHref('spacex/demo', {
      search: 'Return flight',
      provider: 'SpaceX',
      year: 'all',
      outcome: 'all',
      sortBy: 'date-desc',
    });

    expect(href).toBe(
      '/launch/spacex%2Fdemo?from=history&history=q%3DReturn%2Bflight%26provider%3DSpaceX',
    );
    const query = readHistoryReturnQuery(
      'q=Return+flight&provider=SpaceX&redirect=https%3A%2F%2Fevil.test',
    );
    expect(query).toBe('q=Return+flight&provider=SpaceX');
    expect(buildHistoryReturnHref(query!)).toBe(
      '/history?q=Return+flight&provider=SpaceX',
    );
  });

  it('round-trips only canonical mission focus for result restoration', () => {
    expect(
      buildHistoryReturnHref('sort=date-asc', 'spacex-demo-return'),
    ).toBe('/history?sort=date-asc&focus=spacex-demo-return');
    expect(
      readHistoryReturnFocus(
        new URLSearchParams('focus=spacex-demo-return'),
      ),
    ).toBe('spacex-demo-return');
    expect(
      readHistoryReturnFocus(
        new URLSearchParams('focus=one&focus=two'),
      ),
    ).toBeNull();
    expect(
      readHistoryReturnFocus(new URLSearchParams('focus=past-demo')),
    ).toBeNull();
  });

  it('preserves a bounded archive chronology preference', () => {
    const oldestFirst = parseHistoryFilters(
      new URLSearchParams('sort=date-asc'),
    );

    expect(oldestFirst.sortBy).toBe('date-asc');
    expect(serializeHistoryFilters(oldestFirst)).toBe('sort=date-asc');
    expect(
      buildHistoryDetailHref('ll2-demo', oldestFirst),
    ).toBe(
      '/launch/ll2-demo?from=history&history=sort%3Ddate-asc',
    );
    expect(
      parseHistoryFilters(new URLSearchParams('sort=random')).sortBy,
    ).toBe('date-desc');
  });

  it('round-trips the unconfirmed outcome filter', () => {
    const unconfirmed = parseHistoryFilters(
      new URLSearchParams('outcome=pending'),
    );

    expect(unconfirmed.outcome).toBe('pending');
    expect(serializeHistoryFilters(unconfirmed)).toBe('outcome=pending');
    expect(
      buildHistoryDetailHref('ll2-demo', unconfirmed),
    ).toBe(
      '/launch/ll2-demo?from=history&history=outcome%3Dpending',
    );
  });
});
