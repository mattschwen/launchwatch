'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

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
  statusOptions?: Array<{ value: string; label: string }>;
}

const defaultFilters: FilterOptions = {
  search: '',
  provider: 'all',
  status: 'all',
  sortBy: 'date-asc',
};

const defaultProviders = [
  { value: 'all', label: 'ALL' },
  { value: 'spacex', label: 'SPACEX' },
  { value: 'nasa', label: 'NASA' },
  { value: 'ula', label: 'ULA' },
  { value: 'rocket-lab', label: 'ROCKETLAB' },
  { value: 'blue-origin', label: 'BLUE ORIGIN' },
  { value: 'arianespace', label: 'ARIANESPACE' },
];

const defaultStatusOptions = [
  { value: 'all', label: 'ALL' },
  { value: 'upcoming', label: 'GO' },
  { value: 'live', label: 'LIVE' },
  { value: 'success', label: 'SUCCESS' },
  { value: 'failure', label: 'FAILURE' },
  { value: 'tbd', label: 'HOLD' },
];

export default function FilterBar({
  onFilterChange,
  initialFilters,
  showProvider = true,
  statusOptions = defaultStatusOptions,
}: FilterBarProps): React.ReactElement {
  const [filters, setFilters] = useState<FilterOptions>({
    ...defaultFilters,
    ...initialFilters,
  });
  const activeFilterCount =
    Number(Boolean(filters.search)) +
    Number(showProvider && filters.provider !== 'all') +
    Number(filters.status !== 'all');

  const updateFilter = (key: keyof FilterOptions, value: string): void => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="panel corner-brackets p-4 sm:p-5 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] pb-3">
        <div>
          <p className="console-label mb-1 text-[10px]">SEARCH & FILTER</p>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            Narrow the board by mission name, provider, and launch state.
          </p>
        </div>
        <span className="console-value text-xs tracking-[0.2em]">
          {String(activeFilterCount).padStart(2, '0')} ACTIVE
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--console-green)] font-[family-name:var(--font-geist-mono)] text-sm">&gt;</span>
        <input
          type="text"
          placeholder="search launches..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full border border-[var(--panel-border)] bg-[var(--bg-primary)] px-4 py-3 pl-7 text-sm text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)] placeholder-[var(--text-muted)] transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out-quart)] focus:outline-none focus:border-[var(--console-green)]/40 focus:shadow-[0_0_0_1px_rgba(0,255,136,0.12)]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-4 border-r border-[var(--console-green)] animate-blink" />
      </div>

      {/* Provider Filter */}
      {showProvider && (
        <div>
          <label className="console-label text-[10px] mb-2 block">PROVIDER</label>
          <div className="flex flex-wrap gap-1.5">
            {defaultProviders.map((provider) => {
              const isActive = filters.provider === provider.value;
              return (
                <button
                  key={provider.value}
                  onClick={() => updateFilter('provider', provider.value)}
                  className={`px-2.5 py-1.5 text-[10px] sm:text-xs font-[family-name:var(--font-geist-mono)] font-medium tracking-wider transition-[transform,border-color,color,background-color] duration-200 [transition-timing-function:var(--ease-out-quart)] motion-safe:hover:-translate-y-px border ${
                    isActive
                      ? 'border-[var(--console-green)]/50 text-[var(--console-green)] bg-[var(--console-green)]/5'
                      : 'border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--panel-border)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[var(--console-green)] shadow-[0_0_4px_var(--console-green)]' : 'bg-[var(--text-muted)]/30'}`} />
                    {provider.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status & Sort */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="console-label text-[10px] mb-2 block">STATUS</label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full border border-[var(--panel-border)] bg-[var(--bg-primary)] px-3 py-2.5 text-xs text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)] transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out-quart)] focus:outline-none focus:border-[var(--console-green)]/40 focus:shadow-[0_0_0_1px_rgba(0,255,136,0.12)] sm:text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="console-label text-[10px] mb-2 block">SORT</label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as FilterOptions['sortBy'])}
            className="w-full border border-[var(--panel-border)] bg-[var(--bg-primary)] px-3 py-2.5 text-xs text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)] transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out-quart)] focus:outline-none focus:border-[var(--console-green)]/40 focus:shadow-[0_0_0_1px_rgba(0,255,136,0.12)] sm:text-sm"
          >
            <option value="date-asc">SOONEST</option>
            <option value="date-desc">LATEST</option>
            <option value="name-asc">NAME A-Z</option>
            <option value="name-desc">NAME Z-A</option>
          </select>
        </div>
      </div>

      {/* Active Filter Tags */}
      {(filters.search || (showProvider && filters.provider !== 'all') || filters.status !== 'all') && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--panel-border)]">
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--console-cyan)]/30 text-[var(--console-cyan)] text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider"
            >
              [{filters.search}]
              <X size={10} />
            </button>
          )}
          {showProvider && filters.provider !== 'all' && (
            <button
              onClick={() => updateFilter('provider', 'all')}
              className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--console-green)]/30 text-[var(--console-green)] text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider"
            >
              [{defaultProviders.find((provider) => provider.value === filters.provider)?.label}]
              <X size={10} />
            </button>
          )}
          {filters.status !== 'all' && (
            <button
              onClick={() => updateFilter('status', 'all')}
              className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--console-amber)]/30 text-[var(--console-amber)] text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider"
            >
              [{filters.status.toUpperCase()}]
              <X size={10} />
            </button>
          )}
          <button
            onClick={() => {
              const reset = { ...defaultFilters, ...initialFilters, sortBy: filters.sortBy };
              setFilters(reset);
              onFilterChange(reset);
            }}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--console-green)] font-[family-name:var(--font-geist-mono)] tracking-wider transition-colors"
          >
            CLEAR ALL
          </button>
        </div>
      )}
    </div>
  );
}
