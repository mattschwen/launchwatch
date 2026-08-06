import { parseLaunchId } from '@/lib/launch-id';

export interface ScheduleFilters {
  search: string;
  provider: string;
  status: 'all' | 'upcoming' | 'live' | 'tbd';
  sortBy: 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc';
}

export const DEFAULT_SCHEDULE_FILTERS: ScheduleFilters = {
  search: '',
  provider: 'all',
  status: 'all',
  sortBy: 'date-asc',
};

type SearchParamRecord = Record<
  string,
  string | string[] | undefined
>;

export const SCHEDULE_SEARCH_MAX_LENGTH = 120;
const MAX_PROVIDER_LENGTH = 120;

function singleValue(
  value: string | string[] | undefined,
): string | null {
  return typeof value === 'string' ? value : null;
}

function boundedText(
  value: string | null,
  maxLength: number,
): string {
  const normalized = value?.trim() ?? '';
  if (
    !normalized ||
    normalized.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    return '';
  }
  return normalized;
}

export function parseScheduleFilters(
  params: SearchParamRecord | URLSearchParams,
): ScheduleFilters {
  const read = (key: string): string | null =>
    params instanceof URLSearchParams
      ? params.getAll(key).length === 1
        ? params.get(key)
        : null
      : singleValue(params[key]);
  const search = boundedText(read('q'), SCHEDULE_SEARCH_MAX_LENGTH);
  const provider = boundedText(read('provider'), MAX_PROVIDER_LENGTH);
  const status = read('status');
  const sortBy = read('sort');

  return {
    search,
    provider: provider || DEFAULT_SCHEDULE_FILTERS.provider,
    status:
      status === 'upcoming' || status === 'live' || status === 'tbd'
        ? status
        : DEFAULT_SCHEDULE_FILTERS.status,
    sortBy:
      sortBy === 'date-desc' ||
      sortBy === 'name-asc' ||
      sortBy === 'name-desc'
        ? sortBy
        : DEFAULT_SCHEDULE_FILTERS.sortBy,
  };
}

export function serializeScheduleFilters(
  filters: ScheduleFilters,
): string {
  const normalized = parseScheduleFilters({
    q: filters.search,
    provider: filters.provider,
    status: filters.status,
    sort: filters.sortBy,
  });
  const params = new URLSearchParams();

  if (normalized.search) params.set('q', normalized.search);
  if (normalized.provider !== DEFAULT_SCHEDULE_FILTERS.provider) {
    params.set('provider', normalized.provider);
  }
  if (normalized.status !== DEFAULT_SCHEDULE_FILTERS.status) {
    params.set('status', normalized.status);
  }
  if (normalized.sortBy !== DEFAULT_SCHEDULE_FILTERS.sortBy) {
    params.set('sort', normalized.sortBy);
  }

  return params.toString();
}

export function buildScheduleDetailHref(
  launchId: string,
  filters: ScheduleFilters,
): string {
  const schedule = serializeScheduleFilters(filters);
  const base = `/launch/${encodeURIComponent(launchId)}`;
  const params = new URLSearchParams({ from: 'home' });

  if (schedule) params.set('schedule', schedule);

  return `${base}?${params.toString()}`;
}

export function readScheduleReturnQuery(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== 'string' || value.length > 600) return null;
  const query = serializeScheduleFilters(
    parseScheduleFilters(new URLSearchParams(value)),
  );
  return query || null;
}

export function readScheduleReturnFocus(
  params: SearchParamRecord | URLSearchParams,
): string | null {
  const value =
    params instanceof URLSearchParams
      ? params.getAll('focus').length === 1
        ? params.get('focus')
        : null
      : singleValue(params.focus);
  const parsed = value ? parseLaunchId(value) : null;

  return parsed?.legacy ? null : parsed?.canonicalId ?? null;
}

export function buildScheduleReturnHref(
  query: string | null,
  focusId?: string | null,
): string {
  const params = new URLSearchParams(query ?? '');
  const focus = focusId ? parseLaunchId(focusId) : null;

  if (focus && !focus.legacy) params.set('focus', focus.canonicalId);

  const serialized = params.toString();
  return serialized ? `/?${serialized}` : '/';
}
