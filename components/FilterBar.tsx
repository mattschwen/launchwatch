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
    <div className="mb-6 space-y-4">
      {/* Search and Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Search launches..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span>⚙️</span>
          <span>Filters</span>
          <span className="text-xs">{showFilters ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg animate-fade-in">
          {/* Provider Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Provider
            </label>
            <select
              value={filters.provider}
              onChange={(e) => updateFilter('provider', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">All Providers</option>
              <option value="spacex">SpaceX</option>
              <option value="nasa">NASA</option>
              <option value="ula">ULA</option>
              <option value="rocket-lab">Rocket Lab</option>
              <option value="blue-origin">Blue Origin</option>
              <option value="arianespace">Arianespace</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live Now</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="tbd">TBD</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value as FilterOptions['sortBy'])}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="date-asc">Date (Soonest First)</option>
              <option value="date-desc">Date (Latest First)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.search || filters.provider !== 'all' || filters.status !== 'all') && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-400 text-sm rounded-full flex items-center gap-2">
              Search: "{filters.search}"
              <button
                onClick={() => updateFilter('search', '')}
                className="hover:text-blue-300"
              >
                ✕
              </button>
            </span>
          )}
          {filters.provider !== 'all' && (
            <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/50 text-purple-400 text-sm rounded-full flex items-center gap-2">
              {filters.provider}
              <button
                onClick={() => updateFilter('provider', 'all')}
                className="hover:text-purple-300"
              >
                ✕
              </button>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="px-3 py-1 bg-green-600/20 border border-green-500/50 text-green-400 text-sm rounded-full flex items-center gap-2">
              {filters.status}
              <button
                onClick={() => updateFilter('status', 'all')}
                className="hover:text-green-300"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
