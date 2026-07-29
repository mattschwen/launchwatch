'use client';

import { useId, useRef, useState, type RefObject } from 'react';
import { Search, X } from 'lucide-react';

export interface FilterOptions {
  search: string;
  provider: string;
  status: string;
  sortBy: 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc';
}

interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters?: Partial<FilterOptions>;
  showProvider?: boolean;
  providerOptions?: string[];
  statusOptions?: Array<{ value: string; label: string }>;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export const DEFAULT_FILTERS: FilterOptions = {
  search: '',
  provider: 'all',
  status: 'all',
  sortBy: 'date-asc',
};

const statuses = [
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
  const resetFilters = { ...DEFAULT_FILTERS, ...initialFilters };

  const update = <Key extends keyof FilterOptions>(
    key: Key,
    value: FilterOptions[Key]
  ): void => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange(next);
  };

  const active =
    filters.search !== resetFilters.search ||
    (showProvider && filters.provider !== resetFilters.provider) ||
    filters.status !== resetFilters.status ||
    filters.sortBy !== resetFilters.sortBy;

  return (
    <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,16rem)_12rem_12rem_auto]">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <label htmlFor={`${id}-search`} className="sr-only">
          Search launches
        </label>
        <Search
          aria-hidden="true"
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          ref={resolvedSearchInputRef}
          id={`${id}-search`}
          type="search"
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
          placeholder="Search missions"
          className="min-h-11 w-full scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      {showProvider ? (
        <div>
          <label htmlFor={`${id}-provider`} className="sr-only">
            Provider
          </label>
          <select
            id={`${id}-provider`}
            value={filters.provider}
            onChange={(event) => update('provider', event.target.value)}
            className="min-h-11 w-full scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All providers</option>
            {providerOptions.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor={`${id}-status`} className="sr-only">
          Status
        </label>
        <select
          id={`${id}-status`}
          value={filters.status}
          onChange={(event) => update('status', event.target.value)}
          className="min-h-11 w-full scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-sort`} className="sr-only">
          Sort launches
        </label>
        <select
          id={`${id}-sort`}
          value={filters.sortBy}
          onChange={(event) =>
            update('sortBy', event.target.value as FilterOptions['sortBy'])
          }
          className="min-h-11 w-full scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
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
        className="icon-button scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Clear launch filters"
      >
        <X aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
