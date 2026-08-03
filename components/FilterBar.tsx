'use client';

import { useId, useRef, useState, type RefObject } from 'react';
import { Search, X } from 'lucide-react';
import {
  DEFAULT_SCHEDULE_FILTERS,
  SCHEDULE_SEARCH_MAX_LENGTH,
  type ScheduleFilters,
} from '@/lib/schedule-return';

export type FilterOptions = ScheduleFilters;

interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters?: Partial<FilterOptions>;
  showProvider?: boolean;
  providerOptions?: string[];
  statusOptions?: Array<{ value: FilterOptions['status']; label: string }>;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export const DEFAULT_FILTERS = DEFAULT_SCHEDULE_FILTERS;

const statuses: Array<{
  value: FilterOptions['status'];
  label: string;
}> = [
  { value: 'all', label: 'All statuses' },
  { value: 'upcoming', label: 'Scheduled' },
  { value: 'live', label: 'Live' },
  { value: 'tbd', label: 'To be confirmed' },
];

export default function FilterBar({
  onFilterChange,
  initialFilters,
  showProvider = true,
  providerOptions = [],
  statusOptions = statuses,
  searchInputRef,
}: FilterBarProps): React.ReactElement {
  const [filters, setFilters] = useState<FilterOptions>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const internalSearchInputRef = useRef<HTMLInputElement>(null);
  const resolvedSearchInputRef = searchInputRef ?? internalSearchInputRef;
  const id = useId();
  const resetFilters = { ...DEFAULT_FILTERS };

  const update = <Key extends keyof FilterOptions>(
    key: Key,
    value: FilterOptions[Key]
  ): void => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange(next);
  };

  const active =
    Boolean(filters.search.trim()) ||
    (showProvider && filters.provider !== resetFilters.provider) ||
    filters.status !== resetFilters.status ||
    filters.sortBy !== resetFilters.sortBy;
  const selectedProviderMissing =
    showProvider &&
    filters.provider !== DEFAULT_FILTERS.provider &&
    !providerOptions.includes(filters.provider);

  return (
    <div className="grid items-end gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 sm:grid-cols-2 lg:grid-cols-[minmax(11rem,1fr)_minmax(10rem,14rem)_10.5rem_10.5rem_auto]">
      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <label htmlFor={`${id}-search`} className="data-label mb-1.5 block">
          Search launches
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            ref={resolvedSearchInputRef}
            id={`${id}-search`}
            type="search"
            maxLength={SCHEDULE_SEARCH_MAX_LENGTH}
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Mission, profile, orbit, vehicle, site, or provider"
            className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {showProvider ? (
        <div className="min-w-0">
          <label htmlFor={`${id}-provider`} className="data-label mb-1.5 block">
            Provider
          </label>
          <select
            id={`${id}-provider`}
            value={filters.provider}
            onChange={(event) => update('provider', event.target.value)}
            className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All providers</option>
            {selectedProviderMissing ? (
              <option value={filters.provider}>
                {filters.provider} — not in current feed
              </option>
            ) : null}
            {providerOptions.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="min-w-0">
        <label htmlFor={`${id}-status`} className="data-label mb-1.5 block">
          Status
        </label>
        <select
          id={`${id}-status`}
          value={filters.status}
          onChange={(event) =>
            update('status', event.target.value as FilterOptions['status'])
          }
          className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label htmlFor={`${id}-sort`} className="data-label mb-1.5 block">
          Sort launches
        </label>
        <select
          id={`${id}-sort`}
          value={filters.sortBy}
          onChange={(event) =>
            update('sortBy', event.target.value as FilterOptions['sortBy'])
          }
          className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
        >
          <option value="date-asc">Soonest first</option>
          <option value="date-desc">Latest first</option>
          <option value="name-asc">Mission A–Z</option>
          <option value="name-desc">Mission Z–A</option>
        </select>
      </div>

      <button
        type="button"
        disabled={!active}
        onClick={() => {
          const next = { ...resetFilters };
          setFilters(next);
          onFilterChange(next);
          requestAnimationFrame(() => resolvedSearchInputRef.current?.focus());
        }}
        className="action-button action-button-quiet w-full justify-center whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
        aria-label="Clear launch filters"
      >
        <X aria-hidden="true" size={17} />
        Clear filters
      </button>
    </div>
  );
}
