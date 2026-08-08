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
  parseScheduleFilters,
  serializeScheduleFilters,
} from '@/lib/schedule-return';
import { RESET_SCHEDULE_FILTERS_EVENT } from './layout/navigation';

const INITIAL_VISIBLE_COUNT = 5;

export default function LaunchList({
  initialFilters = DEFAULT_FILTERS,
  onFiltersChange,
  returnFocusId = null,
}: {
  initialFilters?: FilterOptions;
  onFiltersChange?: (filters: FilterOptions) => void;
  returnFocusId?: string | null;
}): React.ReactElement {
  const { launches, online, loading, refreshing, error, meta, refresh } = useLaunches();
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(
    () => Boolean(serializeScheduleFilters(initialFilters))
  );
  const [filterSeed, setFilterSeed] = useState<FilterOptions>(initialFilters);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [revealedBatchStartIndex, setRevealedBatchStartIndex] = useState<
    number | null
  >(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const scheduleHeadingRef = useRef<HTMLHeadingElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const revealedBatchStartRef = useRef<HTMLAnchorElement>(null);
  const batchTabPendingRef = useRef(false);
  const retainedRetryRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const returnMissionLinkRef = useRef<HTMLAnchorElement>(null);
  const returnFocusHandledRef = useRef(false);
  const retryFocusPendingRef = useRef(false);
  const retryScrollFrameRef = useRef<number | null>(null);
  const suppressNextUrlWriteRef = useRef(false);
  const retryUnavailable = refreshing || !online;
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
    const applyNavigationFilters = (nextFilters: FilterOptions): void => {
      setFilters({ ...nextFilters });
      setFilterSeed({ ...nextFilters });
      setFiltersOpen(Boolean(serializeScheduleFilters(nextFilters)));
      setVisibleCount(INITIAL_VISIBLE_COUNT);
      setRevealedBatchStartIndex(null);
      batchTabPendingRef.current = false;
      setFilterResetKey((value) => value + 1);
    };
    const resetScheduleFilters = (): void => {
      suppressNextUrlWriteRef.current = true;
      applyNavigationFilters(DEFAULT_FILTERS);
    };
    const restoreScheduleFilters = (): void =>
      applyNavigationFilters(
        parseScheduleFilters(new URLSearchParams(window.location.search)),
      );

    window.addEventListener(
      RESET_SCHEDULE_FILTERS_EVENT,
      resetScheduleFilters,
    );
    window.addEventListener('popstate', restoreScheduleFilters);
    return () => {
      window.removeEventListener(
        RESET_SCHEDULE_FILTERS_EVENT,
        resetScheduleFilters,
      );
      window.removeEventListener('popstate', restoreScheduleFilters);
    };
  }, []);

  useEffect(() => {
    if (!retryFocusPendingRef.current || refreshing) return;

    if (launches.length === 0) {
      retryFocusPendingRef.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      retryFocusPendingRef.current = false;
      if (error) retainedRetryRef.current?.focus();
      else filterToggleRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, launches.length, refreshing]);

  useEffect(() => {
    onFiltersChange?.(filters);
    if (suppressNextUrlWriteRef.current) {
      suppressNextUrlWriteRef.current = false;
      return;
    }

    const query = serializeScheduleFilters(filters);
    const nextUrl = query ? `/?${query}` : '/';
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [filters, onFiltersChange]);

  useEffect(
    () => () => {
      if (retryScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(retryScrollFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (loading || window.location.hash !== '#upcoming-launches') return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('upcoming-launches')?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
      scheduleHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading]);

  const retrySchedule = (event: MouseEvent<HTMLButtonElement>): void => {
    if (retryUnavailable) return;
    const retryButton = event.currentTarget;
    retryFocusPendingRef.current = true;
    void refresh();
    if (retryScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(retryScrollFrameRef.current);
    }
    retryScrollFrameRef.current = window.requestAnimationFrame(() => {
      retryScrollFrameRef.current = null;
      if (retryButton.isConnected) {
        retryButton.scrollIntoView?.({ block: 'nearest' });
      }
    });
  };

  const clearFilters = (): void => {
    const focusTarget = filtersOpen ? searchInputRef : filterToggleRef;
    setFilters({ ...DEFAULT_FILTERS });
    setFilterSeed({ ...DEFAULT_FILTERS });
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setRevealedBatchStartIndex(null);
    batchTabPendingRef.current = false;
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
    launches.length > 0 && (!online || error || meta?.stale),
  );
  const degradedSchedule = Boolean(retainedSchedule || meta?.partial);
  const resultCountLabel =
    filtered.length > INITIAL_VISIBLE_COUNT && !allResultsVisible
      ? `Showing ${visibleLaunches.length} of ${filtered.length} missions`
      : `${filtered.length} mission${filtered.length === 1 ? '' : 's'}`;

  useEffect(() => {
    if (
      loading ||
      !returnFocusId ||
      returnFocusHandledRef.current
    ) {
      return;
    }

    const resultIndex = filtered.findIndex(
      (launch) => launch.id === returnFocusId,
    );
    if (resultIndex < 0) return;

    let focusFrame: number | null = null;
    const revealFrame = window.requestAnimationFrame(() => {
      returnFocusHandledRef.current = true;
      setVisibleCount(
        Math.ceil((resultIndex + 1) / INITIAL_VISIBLE_COUNT) *
          INITIAL_VISIBLE_COUNT,
      );
      focusFrame = window.requestAnimationFrame(() => {
        returnMissionLinkRef.current?.focus();
        returnMissionLinkRef.current?.scrollIntoView?.({ block: 'nearest' });
      });
    });
    return () => {
      window.cancelAnimationFrame(revealFrame);
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
    };
  }, [filtered, loading, returnFocusId]);

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
              className="grid min-h-20 grid-cols-[minmax(7.25rem,.7fr)_minmax(0,1.3fr)] gap-3 border-b border-[var(--border-subtle)] p-4 last:border-0 lg:grid-cols-[minmax(9.5rem,.8fr)_minmax(12rem,1.45fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(11rem,.72fr)]"
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
          aria-disabled={retryUnavailable}
          aria-busy={refreshing}
          className="action-button action-button-secondary mt-5 aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {refreshing
            ? 'Retrying schedule'
            : online
              ? 'Retry schedule'
              : 'Reconnect to retry'}
        </button>
      </section>
    );
  }

  return (
    <section
      id="upcoming-launches"
      aria-labelledby="upcoming-launches-title"
      className={`surface-card holo-card ${
        degradedSchedule ? 'signal-warm' : 'signal-nominal'
      } scroll-mt-20 overflow-hidden`}
    >
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2
            ref={scheduleHeadingRef}
            id="upcoming-launches-title"
            tabIndex={-1}
            className="section-title rounded-[var(--radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--console-cyan)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-base)]"
          >
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
            {!online
              ? ' · device offline; showing last-known schedule'
              : error && launches.length > 0
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
                {!online
                  ? 'Device is offline.'
                  : error
                    ? 'Refresh failed.'
                    : 'Provider cache is stale.'}
              </strong>{' '}
              Showing the last-known mission schedule.
            </span>
          </p>
          <button
            ref={retainedRetryRef}
            type="button"
            onClick={retrySchedule}
            aria-disabled={retryUnavailable}
            aria-busy={refreshing}
            className="action-button action-button-quiet w-full shrink-0 justify-center whitespace-nowrap text-[var(--console-amber)] aria-disabled:cursor-wait aria-disabled:opacity-60 sm:w-auto"
          >
            {refreshing
              ? 'Retrying feed'
              : online
                ? 'Retry feed'
                : 'Refresh when online'}
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
              setRevealedBatchStartIndex(null);
              batchTabPendingRef.current = false;
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
            aria-disabled={!hasActiveFilters && retryUnavailable}
            aria-busy={!hasActiveFilters && refreshing}
            className="action-button action-button-secondary mt-5 aria-disabled:cursor-wait aria-disabled:opacity-60"
          >
            {hasActiveFilters
              ? 'Clear all filters'
              : refreshing
                ? 'Refreshing launch schedule'
                : online
                  ? 'Refresh launch schedule'
                  : 'Reconnect to refresh'}
          </button>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(9.5rem,.8fr)_minmax(12rem,1.45fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(11rem,.72fr)] gap-3 border-b border-[var(--border-subtle)] bg-[rgba(255,255,255,0.012)] px-4 py-2.5 lg:grid"
          >
            <span className="data-label">Date (UTC)</span>
            <span className="data-label">Mission</span>
            <span className="data-label">Vehicle</span>
            <span className="data-label">Site</span>
            <span className="data-label">Status</span>
          </div>
          <div id="upcoming-launch-results">
            {visibleLaunches.map((launch, index) => (
              <div
                key={launch.id}
                className="mission-row"
                style={{
                  '--row-signal': retainedSchedule && launch.isLive
                    ? 'var(--console-amber)'
                    : launch.isLive
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
                  coverageUnconfirmed={retainedSchedule}
                  detailHref={buildScheduleDetailHref(launch.id, filters)}
                  prefetch={false}
                  linkRef={
                    index === revealedBatchStartIndex
                      ? revealedBatchStartRef
                      : launch.id === returnFocusId
                      ? returnMissionLinkRef
                      : undefined
                  }
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
                    setRevealedBatchStartIndex(visibleLaunches.length);
                    batchTabPendingRef.current = true;
                    setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT);
                    requestAnimationFrame(() => {
                      if (!batchTabPendingRef.current) return;
                      loadMoreRef.current?.scrollIntoView?.({
                        block: 'nearest',
                      });
                    });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Tab' || !batchTabPendingRef.current) {
                    return;
                  }

                  batchTabPendingRef.current = false;
                  if (event.shiftKey || !revealedBatchStartRef.current) return;

                  event.preventDefault();
                  revealedBatchStartRef.current.focus();
                  revealedBatchStartRef.current.scrollIntoView?.({
                    block: 'center',
                  });
                }}
                onBlur={() => {
                  batchTabPendingRef.current = false;
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
