'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { AlertTriangle, Filter, Rocket } from 'lucide-react';
import { useLaunches } from '@/lib/hooks';
import {
  isCriticalLaunchStatusName,
  matchesLaunchSearch,
} from '@/lib/format';
import LaunchCard from './LaunchCard';
import FilterBar, {
  DEFAULT_FILTERS,
  type FilterOptions,
} from './FilterBar';
import {
  buildScheduleDetailHref,
  serializeScheduleFilters,
} from '@/lib/schedule-return';

const INITIAL_VISIBLE_COUNT = 5;

export default function LaunchList({
  initialFilters = DEFAULT_FILTERS,
}: {
  initialFilters?: FilterOptions;
}): React.ReactElement {
  const { launches, loading, refreshing, error, meta, refresh } = useLaunches();
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(
    () => Boolean(serializeScheduleFilters(initialFilters))
  );
  const [filterSeed, setFilterSeed] = useState<FilterOptions>(initialFilters);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const retainedRetryRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const retryFocusPendingRef = useRef(false);
  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.provider !== DEFAULT_FILTERS.provider ||
    filters.status !== DEFAULT_FILTERS.status;
  const activeFilterCount = [
    Boolean(filters.search.trim()),
    filters.provider !== DEFAULT_FILTERS.provider,
    filters.status !== DEFAULT_FILTERS.status,
    filters.sortBy !== DEFAULT_FILTERS.sortBy,
  ].filter(Boolean).length;
  const providerOptions = useMemo(
    () =>
      [...new Set(
        launches
          .map((launch) => launch.provider?.trim())
          .filter((provider): provider is string => Boolean(provider))
      )].sort((a, b) => a.localeCompare(b)),
    [launches]
  );

  useEffect(() => {
    if (!retryFocusPendingRef.current || refreshing) return;

    if (launches.length === 0) {
      retryFocusPendingRef.current = false;
      return;
    }

    retryFocusPendingRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      if (error) retainedRetryRef.current?.focus();
      else filterToggleRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, launches.length, refreshing]);

  useEffect(() => {
    const query = serializeScheduleFilters(filters);
    const nextUrl = query ? `/?${query}` : '/';
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [filters]);

  const retrySchedule = (event: MouseEvent<HTMLButtonElement>): void => {
    if (refreshing) return;
    const retryButton = event.currentTarget;
    retryFocusPendingRef.current = true;
    void refresh();
    window.requestAnimationFrame(() =>
      retryButton.scrollIntoView({ block: 'nearest' }),
    );
  };

  const clearFilters = (): void => {
    const focusTarget = filtersOpen ? searchInputRef : filterToggleRef;
    setFilters({ ...DEFAULT_FILTERS });
    setFilterSeed({ ...DEFAULT_FILTERS });
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setFilterResetKey((value) => value + 1);
    requestAnimationFrame(() => focusTarget.current?.focus());
  };

  const filtered = useMemo(() => {
    const result = launches.filter((launch) => {
      const matchesSearch = matchesLaunchSearch(launch, filters.search);
      const matchesProvider =
        filters.provider === 'all' ||
        launch.provider?.trim() === filters.provider;
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
  const visibleLaunches = filtered.slice(0, visibleCount);
  const allResultsVisible =
    filtered.length > 0 && visibleLaunches.length === filtered.length;
  const retainedSchedule = Boolean(
    launches.length > 0 && (error || meta?.stale),
  );
  const degradedSchedule = Boolean(retainedSchedule || meta?.partial);
  const resultCountLabel =
    filtered.length > INITIAL_VISIBLE_COUNT && !allResultsVisible
      ? `Showing ${visibleLaunches.length} of ${filtered.length} missions`
      : `${filtered.length} mission${filtered.length === 1 ? '' : 's'}`;

  if (loading && launches.length === 0) {
    return (
      <section
        aria-labelledby="upcoming-launches-loading-title"
        aria-busy="true"
        className="surface-card holo-card signal-cold"
      >
        <div className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
          <h2
            id="upcoming-launches-loading-title"
            className="section-title"
          >
            Upcoming launches
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Synchronizing mission queue
          </p>
        </div>
        <div aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid min-h-20 grid-cols-[minmax(7.25rem,.7fr)_minmax(0,1.3fr)] gap-3 border-b border-[var(--border-subtle)] p-4 last:border-0 lg:grid-cols-[minmax(9.5rem,.8fr)_minmax(12rem,1.45fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.62fr)]"
            >
              <div className="skeleton rounded" />
              <div className="skeleton rounded" />
              <div className="skeleton hidden rounded lg:block" />
              <div className="skeleton hidden rounded lg:block" />
              <div className="skeleton hidden rounded lg:block" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error && launches.length === 0) {
    return (
      <section className="surface-card holo-card signal-critical p-8 text-center">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto text-[var(--console-red)]"
          size={34}
        />
        <h2 className="section-title mt-4">The schedule is temporarily unavailable.</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-secondary)]">
          {error}
        </p>
        <button
          type="button"
          onClick={retrySchedule}
          aria-disabled={refreshing}
          aria-busy={refreshing}
          className="action-button action-button-secondary mt-5 aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {refreshing ? 'Retrying schedule' : 'Retry schedule'}
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="upcoming-launches-title"
      className={`surface-card holo-card ${
        degradedSchedule ? 'signal-warm' : 'signal-nominal'
      } overflow-hidden`}
    >
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 id="upcoming-launches-title" className="section-title">
            Upcoming launches
          </h2>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label="Upcoming launch results"
            className="mt-1 text-xs text-[var(--text-muted)]"
          >
            {resultCountLabel}
            {error && launches.length > 0
              ? ' · refresh failed; showing last-known schedule'
              : meta?.stale
                ? ' · showing stale provider cache'
                : meta?.partial
                  ? ' · provider data is partial'
                  : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            ref={filterToggleRef}
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="launch-filters"
            aria-label={`${filtersOpen ? 'Hide filters' : 'Filter'}${
              activeFilterCount > 0
                ? `, ${activeFilterCount} active`
                : ''
            }`}
            onClick={() => setFiltersOpen((value) => !value)}
            className="action-button action-button-secondary"
          >
            <Filter aria-hidden="true" size={16} />
            {filtersOpen ? 'Hide filters' : 'Filter'}
            {activeFilterCount > 0 ? (
              <span
                aria-hidden="true"
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--console-cyan)]/15 px-1.5 font-mono text-[0.65rem] text-[var(--console-cyan)]"
              >
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {retainedSchedule ? (
        <div
          role="status"
          className="flex flex-col gap-3 border-b border-[var(--console-amber)]/25 bg-[var(--console-amber)]/[0.055] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <p className="flex items-start gap-2 leading-5 text-[var(--text-secondary)]">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--console-amber)]"
              size={16}
            />
            <span>
              <strong className="font-semibold text-[var(--console-amber)]">
                {error ? 'Refresh failed.' : 'Provider cache is stale.'}
              </strong>{' '}
              Showing the last-known mission schedule.
            </span>
          </p>
          <button
            ref={retainedRetryRef}
            type="button"
            onClick={retrySchedule}
            aria-disabled={refreshing}
            aria-busy={refreshing}
            className="action-button action-button-quiet w-full shrink-0 justify-center whitespace-nowrap text-[var(--console-amber)] aria-disabled:cursor-wait aria-disabled:opacity-60 sm:w-auto"
          >
            {refreshing ? 'Retrying feed' : 'Retry feed'}
          </button>
        </div>
      ) : null}

      {filtersOpen ? (
        <div id="launch-filters" className="border-b border-[var(--border-subtle)] p-3 sm:p-4">
          <FilterBar
            key={filterResetKey}
            initialFilters={filterSeed}
            searchInputRef={searchInputRef}
            providerOptions={providerOptions}
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
            {hasActiveFilters
              ? 'No missions match these filters.'
              : 'No upcoming missions are scheduled.'}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {hasActiveFilters
              ? 'Clear or broaden the search to restore the schedule.'
              : 'Connected providers returned an empty schedule. Check again soon or refresh the feed.'}
          </p>
          <button
            type="button"
            onClick={hasActiveFilters ? clearFilters : retrySchedule}
            aria-disabled={!hasActiveFilters && refreshing}
            aria-busy={!hasActiveFilters && refreshing}
            className="action-button action-button-secondary mt-5 aria-disabled:cursor-wait aria-disabled:opacity-60"
          >
            {hasActiveFilters
              ? 'Clear all filters'
              : refreshing
                ? 'Refreshing launch schedule'
                : 'Refresh launch schedule'}
          </button>
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
          <div id="upcoming-launch-results">
            {visibleLaunches.map((launch) => (
              <div
                key={launch.id}
                className="mission-row"
                style={{
                  '--row-signal': launch.isLive
                    ? 'var(--console-magenta)'
                    : launch.status === 'failure' ||
                        isCriticalLaunchStatusName(launch.statusName)
                      ? 'var(--console-red)'
                      : launch.status === 'tbd'
                        ? 'var(--console-amber)'
                        : 'var(--console-green)',
                } as React.CSSProperties}
              >
                <LaunchCard
                  launch={launch}
                  detailHref={buildScheduleDetailHref(launch.id, filters)}
                />
              </div>
            ))}
          </div>
          {filtered.length > INITIAL_VISIBLE_COUNT ? (
            <div className="border-t border-[var(--border-subtle)] p-4 text-center">
              <button
                ref={loadMoreRef}
                type="button"
                aria-controls="upcoming-launch-results"
                aria-disabled={allResultsVisible}
                onClick={() => {
                  if (!allResultsVisible) {
                    setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT);
                    requestAnimationFrame(() =>
                      loadMoreRef.current?.scrollIntoView?.({
                        block: 'nearest',
                      })
                    );
                  }
                }}
                className="action-button action-button-secondary aria-disabled:cursor-default aria-disabled:opacity-60"
              >
                {allResultsVisible
                  ? `All ${filtered.length} missions loaded`
                  : `Load ${Math.min(
                      INITIAL_VISIBLE_COUNT,
                      filtered.length - visibleLaunches.length
                    )} more`}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
