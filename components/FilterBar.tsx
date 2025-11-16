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

  const providers = [
    { value: 'all', label: 'All', icon: '🚀' },
    { value: 'spacex', label: 'SpaceX', icon: '🔵' },
    { value: 'nasa', label: 'NASA', icon: '🔴' },
    { value: 'ula', label: 'ULA', icon: '🟠' },
    { value: 'rocket-lab', label: 'Rocket Lab', icon: '⚫' },
    { value: 'blue-origin', label: 'Blue Origin', icon: '🔷' },
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="🔍 Search launches..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[var(--text-primary)] text-sm placeholder-gray-400 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            showFilters 
              ? 'bg-[var(--primary)] text-white' 
              : 'bg-white border border-gray-200 text-[var(--text-primary)] hover:border-[var(--primary)]'
          }`}
        >
          <span className="flex items-center gap-2">
            ⚙️ Filters
            <span className="text-xs">{showFilters ? '▲' : '▼'}</span>
          </span>
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 animate-fade-in">
          {/* Provider Filter - Buttons */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
              Provider
            </label>
            <div className="flex flex-wrap gap-2">
              {providers.map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => updateFilter('provider', provider.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.provider === provider.value
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'bg-gray-100 text-[var(--text-primary)] hover:bg-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{provider.icon}</span>
                    <span>{provider.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Status & Sort - Inline Dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              >
                <option value="all">All Launches</option>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live Now</option>
                <option value="success">Successful</option>
                <option value="failure">Failed</option>
                <option value="tbd">TBD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value as FilterOptions['sortBy'])}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              >
                <option value="date-asc">Soonest First</option>
                <option value="date-desc">Latest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Clear All Button */}
          {(filters.search || filters.provider !== 'all' || filters.status !== 'all') && (
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  const newFilters = {
                    search: '',
                    provider: 'all',
                    status: 'all',
                    sortBy: filters.sortBy,
                  };
                  setFilters(newFilters);
                  onFilterChange(newFilters);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] font-medium transition-colors"
              >
                ✕ Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Tags */}
      {(filters.search || filters.provider !== 'all' || filters.status !== 'all') && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="px-3 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] rounded-lg text-sm font-medium hover:bg-[var(--primary)]/20 transition-all"
            >
              🔍 &quot;{filters.search}&quot; ✕
            </button>
          )}
          {filters.provider !== 'all' && (
            <button
              onClick={() => updateFilter('provider', 'all')}
              className="px-3 py-1.5 bg-[var(--secondary)]/10 border border-[var(--secondary)]/30 text-[var(--secondary)] rounded-lg text-sm font-medium hover:bg-[var(--secondary)]/20 transition-all"
            >
              {providers.find(p => p.value === filters.provider)?.icon} {providers.find(p => p.value === filters.provider)?.label} ✕
            </button>
          )}
          {filters.status !== 'all' && (
            <button
              onClick={() => updateFilter('status', 'all')}
              className="px-3 py-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] rounded-lg text-sm font-medium hover:bg-[var(--accent)]/20 transition-all"
            >
              {filters.status} ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
