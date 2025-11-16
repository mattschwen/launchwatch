'use client';

import { useState } from 'react';

export interface FilterOptions {
  search: string;
  provider: string;
  status: string;
  sortBy: 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc';
}

interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    provider: 'all',
    status: 'all',
    sortBy: 'date-asc',
  });

  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="🔍 Search..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="flex-1 px-3 py-2 glass rounded-lg text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 glass glass-hover rounded-lg text-[var(--text-primary)] text-sm"
        >
          ⚙️ {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-3 gap-2 p-3 glass rounded-lg animate-fade-in text-xs">
          <select
            value={filters.provider}
            onChange={(e) => updateFilter('provider', e.target.value)}
            className="px-2 py-1.5 glass rounded text-[var(--text-primary)] bg-white/50"
          >
            <option value="all">All</option>
            <option value="spacex">SpaceX</option>
            <option value="nasa">NASA</option>
            <option value="ula">ULA</option>
            <option value="rocket-lab">Rocket Lab</option>
            <option value="blue-origin">Blue Origin</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-2 py-1.5 glass rounded text-[var(--text-primary)] bg-white/50"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="success">Success</option>
          </select>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as FilterOptions['sortBy'])}
            className="px-2 py-1.5 glass rounded text-[var(--text-primary)] bg-white/50"
          >
            <option value="date-asc">Soonest</option>
            <option value="date-desc">Latest</option>
            <option value="name-asc">A-Z</option>
          </select>
        </div>
      )}

      {(filters.search || filters.provider !== 'all' || filters.status !== 'all') && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="px-2 py-1 bg-[var(--primary)]/20 border border-[var(--primary)]/50 text-[var(--primary-hover)] rounded flex items-center gap-1"
            >
              &quot;{filters.search}&quot; ✕
            </button>
          )}
          {filters.provider !== 'all' && (
            <button
              onClick={() => updateFilter('provider', 'all')}
              className="px-2 py-1 bg-[var(--secondary)]/20 border border-[var(--secondary)]/50 text-[var(--secondary)] rounded"
            >
              {filters.provider} ✕
            </button>
          )}
          {filters.status !== 'all' && (
            <button
              onClick={() => updateFilter('status', 'all')}
              className="px-2 py-1 bg-[var(--accent)]/20 border border-[var(--accent)]/50 text-[var(--accent)] rounded"
            >
              {filters.status} ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
