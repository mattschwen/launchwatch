'use client';

import { useState, useMemo } from 'react';
import { useLaunches } from '@/lib/hooks';
import LaunchCard from './LaunchCard';
import FilterBar, { FilterOptions } from './FilterBar';

export default function LaunchList() {
  const { launches, loading, error } = useLaunches();
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    provider: 'all',
    status: 'all',
    sortBy: 'date-asc',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Apply filters and sorting
  const filteredLaunches = useMemo(() => {
    let filtered = [...launches];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (launch) =>
          launch.name.toLowerCase().includes(searchLower) ||
          launch.rocket.toLowerCase().includes(searchLower) ||
          launch.launchSite.toLowerCase().includes(searchLower) ||
          launch.description?.toLowerCase().includes(searchLower)
      );
    }

    // Provider filter
    if (filters.provider !== 'all') {
      filtered = filtered.filter((launch) => {
        const name = launch.name.toLowerCase();
        const rocket = launch.rocket.toLowerCase();

        switch (filters.provider) {
          case 'spacex':
            return name.includes('spacex') || rocket.includes('falcon') || rocket.includes('starship') || launch.id.startsWith('spacex-');
          case 'nasa':
            return name.includes('nasa') || name.includes('artemis') || name.includes('sls');
          case 'ula':
            return name.includes('ula') || rocket.includes('atlas') || rocket.includes('vulcan') || rocket.includes('delta');
          case 'rocket-lab':
            return name.includes('rocket lab') || rocket.includes('electron');
          case 'blue-origin':
            return name.includes('blue origin') || rocket.includes('new glenn') || rocket.includes('new shepard');
          case 'arianespace':
            return name.includes('arianespace') || rocket.includes('ariane');
          default:
            return true;
        }
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((launch) => launch.status === filters.status);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-asc':
          return a.dateUnix - b.dateUnix;
        case 'date-desc':
          return b.dateUnix - a.dateUnix;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [launches, filters]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 glass rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="glass rounded-xl p-5 sm:p-6 animate-pulse"
            >
              <div className="h-6 bg-[var(--surface)] rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-[var(--surface)] rounded w-3/4"></div>
                <div className="h-4 bg-[var(--surface)] rounded w-1/2"></div>
                <div className="h-4 bg-[var(--surface)] rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 glass rounded-xl p-8">
        <span className="text-4xl mb-4 block">⚠️</span>
        <p className="text-[var(--live)] text-lg font-semibold">{error}</p>
        <p className="text-[var(--text-secondary)] text-sm mt-2">Please try refreshing the page</p>
      </div>
    );
  }

  if (launches.length === 0) {
    return (
      <div className="text-center py-12 glass rounded-xl p-8">
        <span className="text-4xl mb-4 block">🚀</span>
        <p className="text-[var(--text-secondary)] text-lg">No upcoming launches found</p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Upcoming Launches</h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="glass glass-hover px-4 py-2 text-sm text-[var(--text-primary)] rounded-lg"
        >
          {showFilters ? '✕ Close' : '⚙️ Filter'} ({filteredLaunches.length})
        </button>
      </div>

      {showFilters && <FilterBar onFilterChange={setFilters} />}

      {filteredLaunches.length === 0 ? (
        <div className="text-center py-12 glass rounded-xl p-8">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-[var(--text-secondary)] text-lg">No launches match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLaunches.map((launch) => (
            <LaunchCard key={launch.id} launch={launch} showVideo={false} />
          ))}
        </div>
      )}
    </section>
  );
}
