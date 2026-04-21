'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSpaceXPastLaunches } from '@/lib/api';
import { Launch } from '@/lib/types';
import LaunchCard from './LaunchCard';
import FilterBar, { FilterOptions } from './FilterBar';
import ConsolePanel from './ui/ConsolePanel';

export default function PastLaunches() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    provider: 'all',
    status: 'all',
    sortBy: 'date-desc', // Most recent first for history
  });

  useEffect(() => {
    async function fetchPastLaunches() {
      try {
        setLoading(true);
        const pastLaunches = await getSpaceXPastLaunches(50);

        // Convert to our Launch type
        const converted: Launch[] = pastLaunches.map((launch) => ({
          id: `past-${launch.id}`,
          name: launch.name,
          date: launch.date_utc,
          dateUnix: launch.date_unix,
          rocket: typeof launch.rocket === 'object' && launch.rocket !== null ? (launch.rocket.name || 'Unknown Rocket') : (launch.rocket || 'Unknown Rocket'),
          launchSite: typeof launch.launchpad === 'object' && launch.launchpad !== null ? (launch.launchpad.name || launch.launchpad.full_name || 'Unknown Site') : (launch.launchpad || 'Unknown Site'),
          status: launch.success ? 'success' as const : 'failure' as const,
          statusName: launch.success ? 'Success' : 'Failure',
          missionName: launch.name,
          livestream: launch.links.webcast,
          livestreams: launch.links.webcast ? [{
            url: launch.links.webcast,
            title: 'Recorded webcast',
            isLive: false,
          }] : null,
          description: launch.details,
          isLive: false,
          image: launch.links.flickr?.original?.[0] || null,
          missionPatch: launch.links.patch?.small || null,
          rocketImageUrl: null,
          launchImageUrl: launch.links.flickr?.original?.[0] || null,
          location: null,
          provider: 'SpaceX',
          providerLogo: null,
          program: null,
          timeline: null,
          videoThumbnail: null,
          source: 'spacex',
          ll2Id: null,
          orbit: null,
          rocketFamily: typeof launch.rocket === 'object' && launch.rocket !== null ? (launch.rocket.name || null) : (launch.rocket || null),
          rocketVariant: null,
        }));

        setLaunches(converted);
        setError(null);
      } catch (err) {
        setError('Failed to load past launches');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPastLaunches();
  }, []);

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

    // Status filter (success/failure)
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
        <div className="h-12 panel animate-pulse"></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="panel p-5 sm:p-6 animate-pulse"
            >
              <div className="mb-4 h-6 bg-[var(--bg-tertiary)]"></div>
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-[var(--bg-tertiary)]"></div>
                <div className="h-4 w-1/2 bg-[var(--bg-tertiary)]"></div>
                <div className="h-4 w-2/3 bg-[var(--bg-tertiary)]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ConsolePanel label="ARCHIVE ERROR">
        <div className="py-10 text-center">
          <span className="mb-4 block text-4xl">⚠️</span>
          <p className="text-lg font-semibold text-[var(--live)]">{error}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Please try refreshing the archive feed.</p>
        </div>
      </ConsolePanel>
    );
  }

  if (launches.length === 0) {
    return (
      <ConsolePanel label="ARCHIVE EMPTY">
        <div className="py-10 text-center">
          <span className="mb-4 block text-4xl">📜</span>
          <p className="text-lg text-[var(--text-primary)]">No past launches found.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">The archive feed did not return any completed missions.</p>
        </div>
      </ConsolePanel>
    );
  }

  // Stats
  const totalLaunches = launches.length;
  const successfulLaunches = launches.filter((l) => l.status === 'success').length;
  const failedLaunches = launches.filter((l) => l.status === 'failure').length;
  const successRate = ((successfulLaunches / totalLaunches) * 100).toFixed(1);
  const activeFilterCount =
    Number(Boolean(filters.search)) +
    Number(filters.status !== 'all');

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
      <div className="space-y-4 xl:sticky xl:top-20">
        <ConsolePanel label="ARCHIVE SNAPSHOT" className="animate-fade-in">
          <div className="space-y-4">
            <div>
              <p className="console-label mb-2 text-[10px]">RECENT RECORD</p>
              <h2 className="display-title text-xl text-[var(--text-primary)] sm:text-[1.7rem]">
                Mission outcomes at a glance.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                This archive currently tracks recent SpaceX missions with result state and replay availability.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-l-2 border-[var(--console-cyan)]/35 pl-3">
                <p className="console-label text-[10px]">TOTAL</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
                  {totalLaunches}
                </p>
              </div>
              <div className="border-l-2 border-[var(--console-green)]/35 pl-3">
                <p className="console-label text-[10px]">SUCCESS</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--console-green)] font-[family-name:var(--font-geist-mono)]">
                  {successfulLaunches}
                </p>
              </div>
              <div className="border-l-2 border-[var(--console-red)]/35 pl-3">
                <p className="console-label text-[10px]">ANOMALIES</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--console-red)] font-[family-name:var(--font-geist-mono)]">
                  {failedLaunches}
                </p>
              </div>
              <div className="border-l-2 border-[var(--console-amber)]/35 pl-3">
                <p className="console-label text-[10px]">SUCCESS RATE</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--console-amber)] font-[family-name:var(--font-geist-mono)]">
                  {successRate}%
                </p>
              </div>
            </div>
          </div>
        </ConsolePanel>

        <FilterBar
          onFilterChange={setFilters}
          initialFilters={filters}
          showProvider={false}
          statusOptions={[
            { value: 'all', label: 'All Results' },
            { value: 'success', label: 'Successful' },
            { value: 'failure', label: 'Failed' },
          ]}
        />
      </div>

      <div className="space-y-4">
        <ConsolePanel label="MISSION LOG" className="animate-fade-in">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="console-label mb-2 text-[10px]">ARCHIVE FEED</p>
              <h3 className="display-title text-xl text-[var(--text-primary)] sm:text-[1.8rem]">
                Completed missions, recorded coverage, and anomalies.
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
                Search recent launches, isolate nominal or off-nominal outcomes, and reopen mission details without leaving the archive board.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-left sm:text-right">
              <div>
                <p className="console-label text-[10px]">VISIBLE</p>
                <p className="mt-1 text-lg font-semibold text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
                  {filteredLaunches.length}
                </p>
              </div>
              <div>
                <p className="console-label text-[10px]">FILTERS</p>
                <p className="mt-1 text-lg font-semibold text-[var(--console-green)] font-[family-name:var(--font-geist-mono)]">
                  {String(activeFilterCount).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>
        </ConsolePanel>

        {filteredLaunches.length === 0 ? (
          <ConsolePanel label="NO MATCHES">
            <div className="py-8 text-center">
              <span className="mb-3 block text-3xl">🔍</span>
              <p className="text-[var(--text-primary)]">No launches match the current archive filters.</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Clear the search or result state to widen the mission log.</p>
            </div>
          </ConsolePanel>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredLaunches.map((launch, index) => (
              <div key={launch.id} className="animate-stagger-in" style={{ animationDelay: `${index * 45}ms` }}>
                <LaunchCard launch={launch} showCalendar={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
