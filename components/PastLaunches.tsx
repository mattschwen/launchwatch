'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSpaceXPastLaunches } from '@/lib/api';
import { Launch } from '@/lib/types';
import LaunchCard from './LaunchCard';
import FilterBar, { FilterOptions } from './FilterBar';

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

        // Debug: Check first launch structure
        if (pastLaunches.length > 0) {
          console.log('First past launch:', {
            rocket: pastLaunches[0].rocket,
            rocketType: typeof pastLaunches[0].rocket,
            launchpad: pastLaunches[0].launchpad,
            launchpadType: typeof pastLaunches[0].launchpad
          });
        }

        // Convert to our Launch type
        const converted: Launch[] = pastLaunches.map((launch) => ({
          id: `past-${launch.id}`,
          name: launch.name,
          date: launch.date_utc,
          dateUnix: launch.date_unix,
          rocket: typeof launch.rocket === 'object' && launch.rocket !== null ? (launch.rocket.name || 'Unknown Rocket') : (launch.rocket || 'Unknown Rocket'),
          launchSite: typeof launch.launchpad === 'object' && launch.launchpad !== null ? (launch.launchpad.name || launch.launchpad.full_name || 'Unknown Site') : (launch.launchpad || 'Unknown Site'),
          status: launch.success ? 'success' as const : 'failure' as const,
          livestream: launch.links.webcast,
          description: launch.details,
          isLive: false,
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
        <div className="h-12 bg-gray-800 border border-gray-700 rounded-lg animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 animate-pulse"
            >
              <div className="h-6 bg-gray-700 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">{error}</p>
        <p className="text-gray-400 text-sm mt-2">Please try refreshing the page</p>
      </div>
    );
  }

  if (launches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No past launches found</p>
      </div>
    );
  }

  // Stats
  const totalLaunches = launches.length;
  const successfulLaunches = launches.filter((l) => l.status === 'success').length;
  const failedLaunches = launches.filter((l) => l.status === 'failure').length;
  const successRate = ((successfulLaunches / totalLaunches) * 100).toFixed(1);

  return (
    <div>
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-900/5 border border-blue-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-400">{totalLaunches}</div>
          <div className="text-sm text-gray-400 mt-1">Total Launches</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-400">{successfulLaunches}</div>
          <div className="text-sm text-gray-400 mt-1">Successful</div>
        </div>
        <div className="bg-gradient-to-br from-red-900/20 to-red-900/5 border border-red-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-400">{failedLaunches}</div>
          <div className="text-sm text-gray-400 mt-1">Failed</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border border-purple-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-400">{successRate}%</div>
          <div className="text-sm text-gray-400 mt-1">Success Rate</div>
        </div>
      </div>

      {/* Filters */}
      <FilterBar onFilterChange={setFilters} />

      {/* Results */}
      {filteredLaunches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No launches match your filters</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-gray-400 text-sm">
            Showing {filteredLaunches.length} of {totalLaunches} launches
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLaunches.map((launch) => (
              <LaunchCard key={launch.id} launch={launch} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
