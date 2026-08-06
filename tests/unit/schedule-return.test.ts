import { describe, expect, it } from 'vitest';
import {
  buildScheduleDetailHref,
  buildScheduleReturnHref,
  DEFAULT_SCHEDULE_FILTERS,
  parseScheduleFilters,
  readScheduleReturnFocus,
  readScheduleReturnQuery,
  SCHEDULE_SEARCH_MAX_LENGTH,
  serializeScheduleFilters,
} from '@/lib/schedule-return';

describe('schedule return context', () => {
  it('parses only bounded supported filters', () => {
    expect(
      parseScheduleFilters(
        new URLSearchParams(
          'q=Polaris&provider=SpaceX&status=live&sort=name-desc',
        ),
      ),
    ).toEqual({
      search: 'Polaris',
      provider: 'SpaceX',
      status: 'live',
      sortBy: 'name-desc',
    });

    expect(
      parseScheduleFilters(
        new URLSearchParams('q=one&q=two&status=invalid&sort=random'),
      ),
    ).toEqual(DEFAULT_SCHEDULE_FILTERS);

    expect(
      parseScheduleFilters(
        new URLSearchParams({ q: 'x'.repeat(SCHEDULE_SEARCH_MAX_LENGTH) }),
      ).search,
    ).toHaveLength(SCHEDULE_SEARCH_MAX_LENGTH);
    expect(
      parseScheduleFilters(
        new URLSearchParams({ q: 'x'.repeat(SCHEDULE_SEARCH_MAX_LENGTH + 1) }),
      ).search,
    ).toBe('');
  });

  it('serializes only non-default filters into a canonical order', () => {
    expect(
      serializeScheduleFilters({
        search: 'Polaris Relay',
        provider: 'SpaceX',
        status: 'upcoming',
        sortBy: 'date-desc',
      }),
    ).toBe(
      'q=Polaris+Relay&provider=SpaceX&status=upcoming&sort=date-desc',
    );
    expect(serializeScheduleFilters(DEFAULT_SCHEDULE_FILTERS)).toBe('');
  });

  it('builds a detail link and validated schedule return link', () => {
    expect(
      buildScheduleDetailHref(
        'll2-demo-orbital-dawn',
        DEFAULT_SCHEDULE_FILTERS,
      ),
    ).toBe('/launch/ll2-demo-orbital-dawn?from=home');

    expect(
      buildScheduleDetailHref('spacex/demo', {
        ...DEFAULT_SCHEDULE_FILTERS,
        search: 'Polaris Relay',
        provider: 'SpaceX',
      }),
    ).toBe(
      '/launch/spacex%2Fdemo?from=home&schedule=q%3DPolaris%2BRelay%26provider%3DSpaceX',
    );

    const query = readScheduleReturnQuery(
      'q=Polaris+Relay&provider=SpaceX&status=invalid&unknown=value',
    );
    expect(query).toBe('q=Polaris+Relay&provider=SpaceX');
    expect(buildScheduleReturnHref(query!)).toBe(
      '/?q=Polaris+Relay&provider=SpaceX',
    );
  });

  it('round-trips only canonical mission focus for result restoration', () => {
    expect(
      buildScheduleReturnHref('q=Polaris', 'll2-demo-orbital-dawn'),
    ).toBe('/?q=Polaris&focus=ll2-demo-orbital-dawn');
    expect(
      readScheduleReturnFocus(
        new URLSearchParams('focus=ll2-demo-orbital-dawn'),
      ),
    ).toBe('ll2-demo-orbital-dawn');
    expect(
      readScheduleReturnFocus(
        new URLSearchParams('focus=one&focus=two'),
      ),
    ).toBeNull();
    expect(
      readScheduleReturnFocus(new URLSearchParams('focus=past-demo')),
    ).toBeNull();
  });

  it('rejects oversized or empty nested return state', () => {
    expect(readScheduleReturnQuery('x'.repeat(601))).toBeNull();
    expect(readScheduleReturnQuery('status=invalid')).toBeNull();
    expect(readScheduleReturnQuery(['q=Polaris'])).toBeNull();
  });
});
