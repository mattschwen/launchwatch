'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Filter, Rocket } from 'lucide-react';
import { useLaunches } from '@/lib/hooks';
import LaunchCard from './LaunchCard';
import FilterBar, { type FilterOptions } from './FilterBar';

const INITIAL_VISIBLE_COUNT = 5;

function providerMatches(providerFilter: string, provider: string): boolean {
  const normalized = provider.toLowerCase();
  switch (providerFilter) {
    case 'spacex':
      return normalized.includes('spacex');
    case 'nasa':
      return normalized.includes('nasa');
    case 'ula':
      return (
        normalized.includes('ula') ||
        normalized.includes('united launch alliance')
      );
    case 'rocket-lab':
      return normalized.includes('rocket lab');
    case 'blue-origin':
      return normalized.includes('blue origin');
    case 'arianespace':
      return normalized.includes('arianespace');
    default:
      return true;
  }
}

export default function LaunchList(): React.ReactElement {
  const { launches, loading, error, meta, refresh } = useLaunches();
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    provider: 'all',
    status: 'all',
    sortBy: 'date-asc',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const result = launches.filter((launch) => {
      const matchesSearch =
        !search ||
        [launch.name, launch.rocket, launch.launchSite, launch.provider || '']
          .join(' ')
          .toLowerCase()
          .includes(search);
      const matchesProvider =
        filters.provider === 'all' ||
        providerMatches(filters.provider, launch.provider || launch.name);
      const matchesStatus =
        filters.status === 'all' || launch.status === filters.status;
      return matchesSearch && matchesProvider && matchesStatus;
    });

    return result.sort((a, b) => {
      if (filters.sortBy === 'date-desc') return b.dateUnix - a.dateUnix;
      if (filters.sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (filters.sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return a.dateUnix - b.dateUnix;
    });
  }, [filters, launches]);

  if (loading && launches.length === 0) {
    return (
      <section aria-label="Loading upcoming launches" className="surface-card">
        <div className="border-b border-[var(--border-subtle)] p-5">
          <div className="skeleton h-8 w-52 rounded" />
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid min-h-20 grid-cols-[10rem_1fr] gap-4 border-b border-[var(--border-subtle)] p-4 last:border-0"
          >
            <div className="skeleton rounded" />
            <div className="skeleton rounded" />
          </div>
        ))}
      </section>
    );
  }

  if (error && launches.length === 0) {
    return (
      <section className="surface-card p-8 text-center">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto text-[var(--console-amber)]"
          size={34}
        />
        <h2 className="section-title mt-4">The schedule is temporarily unavailable.</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-secondary)]">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="action-button action-button-secondary mt-5"
        >
          Retry schedule
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="upcoming-launches-title" className="surface-card overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 id="upcoming-launches-title" className="section-title">
            Upcoming launches
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {filtered.length} mission{filtered.length === 1 ? '' : 's'}
            {meta?.partial ? ' · provider data is partial' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="launch-filters"
            onClick={() => setFiltersOpen((value) => !value)}
            className="action-button action-button-secondary"
          >
            <Filter aria-hidden="true" size={16} />
            {filtersOpen ? 'Hide filters' : 'Filter'}
          </button>
          {filtered.length > INITIAL_VISIBLE_COUNT ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((count) =>
                  count > INITIAL_VISIBLE_COUNT
                    ? INITIAL_VISIBLE_COUNT
                    : filtered.length,
                )
              }
              className="action-button action-button-quiet"
            >
              {visibleCount > INITIAL_VISIBLE_COUNT ? 'Show fewer' : 'View all'}
            </button>
          ) : null}
        </div>
      </header>

      {filtersOpen ? (
        <div id="launch-filters" className="border-b border-[var(--border-subtle)] p-3 sm:p-4">
          <FilterBar
            onFilterChange={(next) => {
              setFilters(next);
              setVisibleCount(INITIAL_VISIBLE_COUNT);
            }}
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <Rocket
            aria-hidden="true"
            className="mx-auto text-[var(--text-muted)]"
            size={32}
          />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            No missions match these filters.
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Clear or broaden the search to restore the schedule.
          </p>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(9.5rem,.8fr)_minmax(12rem,1.45fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.62fr)] gap-3 border-b border-[var(--border-subtle)] bg-[rgba(255,255,255,0.012)] px-4 py-2.5 lg:grid"
          >
            <span className="data-label">Date (UTC)</span>
            <span className="data-label">Mission</span>
            <span className="data-label">Vehicle</span>
            <span className="data-label">Site</span>
            <span className="data-label">Status</span>
          </div>
          <div>
            {filtered.slice(0, visibleCount).map((launch) => (
              <LaunchCard key={launch.id} launch={launch} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
