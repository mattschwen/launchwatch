'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import type { Launch, LaunchFeedMeta } from '@/lib/types';
import {
  formatLaunchValue,
  formatLaunchDate,
  launchOutcomeLabel,
  shortenLaunchSite,
} from '@/lib/format';
import {
  buildHistoryDetailHref,
  DEFAULT_HISTORY_FILTERS,
  type HistoryFilters,
} from '@/lib/history-return';
import MissionVisual from '@/components/launch/MissionVisual';

const PAGE_SIZE = 20;

function readHistoryPayload(payload: unknown): {
  launches: Launch[];
  meta: LaunchFeedMeta | null;
} {
  if (!payload || typeof payload !== 'object') {
    return { launches: [], meta: null };
  }
  const record = payload as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : null;
  const launches = Array.isArray(record.launches)
    ? (record.launches as Launch[])
    : Array.isArray(record.data)
      ? (record.data as Launch[])
      : Array.isArray(nested?.launches)
        ? (nested.launches as Launch[])
        : [];

  return {
    launches,
    meta:
      record.meta && typeof record.meta === 'object'
        ? (record.meta as LaunchFeedMeta)
        : null,
  };
}

function HistoryRow({
  launch,
  expanded,
  onToggle,
  detailHref,
}: {
  launch: Launch;
  expanded: boolean;
  onToggle: () => void;
  detailHref: string;
}): React.ReactElement {
  const panelId = `history-${launch.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const outcome = launchOutcomeLabel(launch);

  return (
    <article
      className="mission-row border-b border-[var(--border-subtle)] last:border-b-0"
      style={{
        '--row-signal':
          launch.status === 'failure'
            ? 'var(--console-red)'
            : launch.status === 'success'
              ? 'var(--console-green)'
              : 'var(--console-amber)',
      } as CSSProperties}
    >
      <div className="grid items-center gap-3 px-3 py-3 sm:px-4 xl:grid-cols-[minmax(13rem,1.25fr)_minmax(11rem,.9fr)_minmax(9rem,.75fr)_minmax(12rem,1fr)_8rem_7rem]">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="group min-h-11 min-w-0 text-left xl:col-span-5 xl:grid xl:grid-cols-subgrid xl:items-center"
        >
          <span className="flex min-w-0 items-center gap-3">
            <ChevronDown
              aria-hidden="true"
              size={17}
              className={`shrink-0 text-[var(--text-muted)] transition-transform ${
                expanded ? 'rotate-180 text-[var(--console-cyan)]' : ''
              }`}
            />
            <span className="min-w-0">
              <span className="block break-words font-semibold leading-5 text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
                {launch.name}
              </span>
              <span className="mt-0.5 block break-words text-xs leading-4 text-[var(--text-muted)]">
                {launch.provider || 'Launch provider'}
              </span>
            </span>
          </span>
          <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-4 xl:hidden">
            <span className="min-w-0">
              <span className="data-label block">Date (UTC)</span>
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                {formatLaunchDate(launch.date, launch.datePrecision)}
              </span>
            </span>
            <span className="min-w-0">
              <span className="data-label block">Vehicle</span>
              <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">
                {launch.rocket}
              </span>
            </span>
            <span className="min-w-0">
              <span className="data-label block">Site</span>
              <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">
                {shortenLaunchSite(launch.launchSite)}
              </span>
            </span>
            <span className="min-w-0">
              <span className="data-label block">Outcome</span>
              <span
                className={`mt-1 flex items-center gap-2 font-mono text-xs ${
                  launch.status === 'failure'
                    ? 'text-[var(--console-red)]'
                    : 'text-[var(--console-green)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    launch.status === 'failure'
                      ? 'bg-[var(--console-red)]'
                      : 'bg-[var(--console-green)]'
                  }`}
                />
                <span className="truncate">{outcome}</span>
              </span>
            </span>
          </span>
          <span className="hidden text-sm text-[var(--text-secondary)] xl:block">
            {formatLaunchDate(launch.date, launch.datePrecision)}
          </span>
          <span className="hidden truncate text-sm text-[var(--text-secondary)] xl:block">
            {launch.rocket}
          </span>
          <span className="hidden truncate text-sm text-[var(--text-secondary)] xl:block">
            {shortenLaunchSite(launch.launchSite)}
          </span>
          <span
            className={`hidden items-center gap-2 font-mono text-xs xl:flex ${
              launch.status === 'failure'
                ? 'text-[var(--console-red)]'
                : 'text-[var(--console-green)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                launch.status === 'failure'
                  ? 'bg-[var(--console-red)]'
                  : 'bg-[var(--console-green)]'
              }`}
            />
            {outcome}
          </span>
        </button>

        <Link
          href={detailHref}
          className="action-button action-button-quiet justify-self-start xl:justify-self-end"
        >
          View mission
        </Link>
      </div>

      {expanded ? (
        <div
          id={panelId}
          className="grid gap-5 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]/45 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
        >
          <div>
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {launch.description || 'No mission summary was supplied by the provider.'}
            </p>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="data-label">Mission type</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">
                  {formatLaunchValue(launch.missionType)}
                </dd>
              </div>
              <div>
                <dt className="data-label">Orbit</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">
                  {formatLaunchValue(launch.orbit)}
                </dd>
              </div>
              <div>
                <dt className="data-label">Outcome</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">
                  {outcome}
                </dd>
              </div>
            </dl>
          </div>
          <div className="min-w-0 space-y-3">
            <MissionVisual launch={launch} compact />
            <div className="flex flex-wrap content-start gap-2 lg:justify-end">
              {launch.livestream ? (
                <Link
                  href={`/watch?id=${encodeURIComponent(launch.id)}`}
                  className="action-button action-button-stream"
                >
                  Watch replay
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function PastLaunches({
  initialFilters = DEFAULT_HISTORY_FILTERS,
}: {
  initialFilters?: HistoryFilters;
}): React.ReactElement {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<LaunchFeedMeta | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [search, setSearch] = useState(initialFilters.search);
  const [provider, setProvider] = useState(initialFilters.provider);
  const [year, setYear] = useState(initialFilters.year);
  const [outcome, setOutcome] = useState(initialFilters.outcome);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const focusSearchAfterRetryRef = useRef(false);
  const id = useId();

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHistory(): Promise<void> {
      try {
        setLoading(true);
        const response = await fetch('/api/launches?type=history&limit=100', {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            payload && typeof payload === 'object'
              ? (payload as Record<string, unknown>).error
              : null;
          throw new Error(
            typeof message === 'string'
              ? message
              : `Archive unavailable (${response.status})`
          );
        }

        const result = readHistoryPayload(payload);
        setLaunches(result.launches);
        setMeta(result.meta);
        setError(null);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load the archive'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRetrying(false);
        }
      }
    }

    void fetchHistory();
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!focusSearchAfterRetryRef.current || loading) return;

    focusSearchAfterRetryRef.current = false;
    if (!error) searchRef.current?.focus();
  }, [error, loading]);

  const providers = useMemo(
    () =>
      [...new Set(launches.map((launch) => launch.provider).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b))) as string[],
    [launches]
  );
  const years = useMemo(
    () =>
      [...new Set(launches.map((launch) => new Date(launch.date).getUTCFullYear()))]
        .filter(Number.isFinite)
        .sort((a, b) => b - a),
    [launches]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return launches.filter((launch) => {
      const matchesSearch =
        !normalizedSearch ||
        [launch.name, launch.rocket, launch.launchSite, launch.provider || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesProvider =
        provider === 'all' || launch.provider === provider;
      const matchesYear =
        year === 'all' ||
        new Date(launch.date).getUTCFullYear() === Number(year);
      const matchesOutcome =
        outcome === 'all' || launch.status === outcome;
      return matchesSearch && matchesProvider && matchesYear && matchesOutcome;
    });
  }, [launches, outcome, provider, search, year]);
  const filtersActive =
    Boolean(search.trim()) ||
    provider !== 'all' ||
    year !== 'all' ||
    outcome !== 'all';
  const visibleLaunches = filtered.slice(0, visibleCount);
  const allResultsVisible =
    filtered.length > 0 && visibleLaunches.length === filtered.length;
  const resultCountLabel =
    filtered.length > PAGE_SIZE && !allResultsVisible
      ? `Showing ${visibleLaunches.length} of ${filtered.length} results`
      : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;

  const clearFilters = (): void => {
    setSearch('');
    setProvider('all');
    setYear('all');
    setOutcome('all');
    setVisibleCount(PAGE_SIZE);
    searchRef.current?.focus();
  };

  const retryHistory = (): void => {
    if (loading || retrying) return;
    focusSearchAfterRetryRef.current = true;
    setRetrying(true);
    setReloadKey((key) => key + 1);
  };

  if (loading && launches.length === 0 && !error) {
    return (
      <section
        className="surface-card holo-card signal-cold overflow-hidden"
        aria-label="Loading launch history"
      >
        <div className="skeleton m-4 h-12 rounded" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="skeleton mx-4 mb-2 h-16 rounded"
          />
        ))}
      </section>
    );
  }

  if (error && launches.length === 0) {
    return (
      <section className="surface-card holo-card signal-critical p-8 text-center">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto text-[var(--console-red)]"
          size={36}
        />
        <h2 className="section-title mt-4">The archive could not be synchronized.</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
          {error}
        </p>
        <button
          type="button"
          onClick={retryHistory}
          aria-disabled={retrying}
          aria-busy={retrying}
          className="action-button action-button-secondary mt-5 aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {retrying ? 'Retrying archive' : 'Retry archive'}
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="archive-results-title"
      className="surface-card holo-card signal-warm overflow-hidden"
    >
      <div className="border-b border-[var(--border-subtle)] p-4">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_10rem_11rem_auto]">
          <div className="relative min-w-0">
            <label htmlFor={`${id}-search`} className="sr-only">
              Search missions
            </label>
            <Search
              aria-hidden="true"
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              ref={searchRef}
              id={`${id}-search`}
              type="search"
              maxLength={120}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Search missions"
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <label className="sr-only" htmlFor={`${id}-provider`}>
            Provider
          </label>
          <select
            id={`${id}-provider`}
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="min-h-11 min-w-0 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All providers</option>
            {providers.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor={`${id}-year`}>
            Year
          </label>
          <select
            id={`${id}-year`}
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="min-h-11 min-w-0 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All years</option>
            {years.map((item) => (
              <option key={item} value={String(item)}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor={`${id}-outcome`}>
            Outcome
          </label>
          <select
            id={`${id}-outcome`}
            value={outcome}
            onChange={(event) => {
              setOutcome(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="min-h-11 min-w-0 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>

          <div className="flex min-h-11 items-center justify-between gap-3 md:col-span-2 xl:col-span-1 xl:justify-end">
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="Archive results"
              className="text-sm text-[var(--text-muted)]"
            >
              {resultCountLabel}
            </p>
            <button
              type="button"
              disabled={!filtersActive}
              onClick={clearFilters}
              className="icon-button shrink-0 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Clear archive filters"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
      </div>

      {meta?.partial || meta?.stale ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--console-amber)]/30 bg-[var(--console-amber)]/[0.06] px-4 py-3">
          <p className="text-sm text-[var(--console-amber)]">
            Some archive results may be delayed while a provider recovers.
          </p>
          <button
            type="button"
            onClick={retryHistory}
            aria-disabled={retrying}
            aria-busy={retrying}
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--console-cyan)] hover:underline aria-disabled:cursor-wait aria-disabled:opacity-60"
          >
            {retrying ? 'Retrying' : 'Retry'}
          </button>
        </div>
      ) : null}

      <div className="hidden grid-cols-[minmax(13rem,1.25fr)_minmax(11rem,.9fr)_minmax(9rem,.75fr)_minmax(12rem,1fr)_8rem_7rem] gap-3 border-b border-[var(--border-subtle)] px-4 py-3 xl:grid">
        {['Mission', 'Actual launch date', 'Vehicle', 'Site', 'Outcome', 'Actions'].map(
          (label) => (
            <span key={label} className="data-label">
              {label}
            </span>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <Archive
            aria-hidden="true"
            className="mx-auto text-[var(--text-muted)]"
            size={34}
          />
          <h2 id="archive-results-title" className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {filtersActive
              ? 'No archived missions match these filters.'
              : 'No archived missions are available.'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {filtersActive
              ? 'Clear the search, provider, year, or outcome selection.'
              : 'Connected providers returned an empty archive. Refresh the feed to check for recovered mission records.'}
          </p>
          <button
            type="button"
            onClick={filtersActive ? clearFilters : retryHistory}
            aria-label={
              filtersActive ? 'Clear empty-result filters' : undefined
            }
            aria-disabled={!filtersActive && retrying}
            aria-busy={!filtersActive && retrying}
            className="action-button action-button-secondary mt-5 aria-disabled:cursor-wait aria-disabled:opacity-60"
          >
            {filtersActive
              ? 'Clear archive filters'
              : retrying
                ? 'Refreshing launch archive'
                : 'Refresh launch archive'}
          </button>
        </div>
      ) : (
        <>
          <h2 id="archive-results-title" className="sr-only">
            Archived launch results
          </h2>
          <div id={`${id}-results`}>
            {visibleLaunches.map((launch) => (
              <HistoryRow
                key={launch.id}
                launch={launch}
                expanded={expandedId === launch.id}
                detailHref={buildHistoryDetailHref(launch.id, {
                  search,
                  provider,
                  year,
                  outcome,
                })}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === launch.id ? null : launch.id
                  )
                }
              />
            ))}
          </div>
          {filtered.length > PAGE_SIZE ? (
            <div className="border-t border-[var(--border-subtle)] p-4 text-center">
              <button
                ref={loadMoreRef}
                type="button"
                aria-controls={`${id}-results`}
                aria-disabled={allResultsVisible}
                onClick={() => {
                  if (!allResultsVisible) {
                    setVisibleCount((count) => count + PAGE_SIZE);
                    requestAnimationFrame(() =>
                      loadMoreRef.current?.scrollIntoView?.({
                        block: 'nearest',
                      })
                    );
                  }
                }}
                className="action-button action-button-secondary scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] aria-disabled:cursor-default aria-disabled:opacity-60"
              >
                {allResultsVisible
                  ? `All ${filtered.length} missions loaded`
                  : `Load ${Math.min(
                      PAGE_SIZE,
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
