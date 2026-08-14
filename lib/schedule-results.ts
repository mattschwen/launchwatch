import {
  hasCalendarReadyLaunchTime,
  matchesLaunchSearch,
} from '@/lib/format';
import { isNearTermLaunch } from '@/lib/schedule-horizon';
import type { ScheduleFilters } from '@/lib/schedule-return';
import type { Launch } from '@/lib/types';

export function getScheduleResults(
  launches: Launch[],
  filters: ScheduleFilters,
  referenceTime: number,
): Launch[] {
  const results = launches.filter((launch) => {
    const matchesSearch = matchesLaunchSearch(launch, filters.search);
    const matchesProvider =
      filters.provider === 'all' ||
      launch.provider?.trim() === filters.provider;
    const matchesHorizon =
      filters.horizon === 'all' ||
      isNearTermLaunch(launch, referenceTime);
    const matchesStatus =
      filters.status === 'all' || launch.status === filters.status;
    const matchesCalendarReadiness =
      !filters.calendarReady ||
      hasCalendarReadyLaunchTime(launch.datePrecision);

    return (
      matchesSearch &&
      matchesProvider &&
      matchesHorizon &&
      matchesStatus &&
      matchesCalendarReadiness
    );
  });

  return results.sort((left, right) => {
    if (filters.sortBy === 'date-desc') {
      return right.dateUnix - left.dateUnix;
    }
    if (filters.sortBy === 'name-asc') {
      return left.name.localeCompare(right.name);
    }
    if (filters.sortBy === 'name-desc') {
      return right.name.localeCompare(left.name);
    }
    return left.dateUnix - right.dateUnix;
  });
}
