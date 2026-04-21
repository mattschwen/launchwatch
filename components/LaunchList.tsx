'use client';

import { useState, useMemo } from 'react';
import { useLaunches } from '@/lib/hooks';
import LaunchCard from './LaunchCard';
import FilterBar, { FilterOptions } from './FilterBar';
import { SlidersHorizontal, X, Rocket, Search, AlertTriangle } from 'lucide-react';

export default function LaunchList(): React.ReactElement {
  const { launches, loading, error } = useLaunches();
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    provider: 'all',
    status: 'all',
    sortBy: 'date-asc',
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredLaunches = useMemo(() => {
    let filtered = [...launches];

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

    if (filters.provider !== 'all') {
      filtered = filtered.filter((launch) => {
        const provider = (launch.provider || '').toLowerCase();
        const name = launch.name.toLowerCase();
        const rocket = launch.rocket.toLowerCase();

        switch (filters.provider) {
          case 'spacex':
            return provider.includes('spacex') || name.includes('spacex') || rocket.includes('falcon') || rocket.includes('starship') || launch.id.startsWith('spacex-');
          case 'nasa':
            return provider.includes('nasa') || name.includes('nasa') || name.includes('artemis');
          case 'ula':
            return provider.includes('ula') || provider.includes('united launch') || name.includes('ula') || rocket.includes('atlas') || rocket.includes('vulcan');
          case 'rocket-lab':
            return provider.includes('rocket lab') || name.includes('rocket lab') || rocket.includes('electron');
          case 'blue-origin':
            return provider.includes('blue origin') || name.includes('blue origin') || rocket.includes('new glenn');
          case 'arianespace':
            return provider.includes('arianespace') || name.includes('arianespace') || rocket.includes('ariane') || rocket.includes('vega');
          default:
            return true;
        }
      });
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((launch) => launch.status === filters.status);
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-asc': return a.dateUnix - b.dateUnix;
        case 'date-desc': return b.dateUnix - a.dateUnix;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    return filtered;
  }, [launches, filters]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 panel animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="panel animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-2/3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 panel p-8">
        <AlertTriangle size={40} className="mx-auto text-[var(--console-red)] mb-4" />
        <p className="text-[var(--console-red)] text-lg font-[family-name:var(--font-geist-mono)]">{error}</p>
        <p className="text-[var(--text-muted)] text-sm mt-2">System error — try refreshing</p>
      </div>
    );
  }

  if (launches.length === 0) {
    return (
      <div className="text-center py-12 panel p-8">
        <Rocket size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-muted)] text-lg font-[family-name:var(--font-geist-mono)]">NO UPCOMING LAUNCHES</p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[var(--panel-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="console-label mb-2 text-[10px]">MISSION BOARD</p>
          <h2 className="display-title text-2xl text-[var(--text-primary)] sm:text-[2rem]">
            Upcoming launches and live windows.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Filter by provider or state, then jump straight into streams, briefings, and pad telemetry.
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="panel-interactive px-3 py-2 text-[10px] sm:text-xs text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)] tracking-wider inline-flex items-center gap-2 hover:text-[var(--console-green)] self-start sm:self-auto"
        >
          {showFilters ? <X size={14} /> : <SlidersHorizontal size={14} />}
          {showFilters ? 'HIDE FILTERS' : 'OPEN FILTERS'}
          <span className="text-[var(--console-cyan)]">({filteredLaunches.length})</span>
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] ${
          showFilters ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {showFilters && <FilterBar onFilterChange={setFilters} />}
        </div>
      </div>

      {filteredLaunches.length === 0 ? (
        <div className="text-center py-12 panel p-8">
          <Search size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">NO MATCHING LAUNCHES</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredLaunches.map((launch, index) => (
            <div key={launch.id} className="animate-stagger-in" style={{ animationDelay: `${index * 40}ms` }}>
              <LaunchCard launch={launch} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
