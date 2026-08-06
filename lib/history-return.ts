import { parseLaunchId } from '@/lib/launch-id';

export interface HistoryFilters {
  search: string;
  provider: string;
  year: string;
  outcome: string;
  sortBy: 'date-desc' | 'date-asc';
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  search: '',
  provider: 'all',
  year: 'all',
  outcome: 'all',
  sortBy: 'date-desc',
};

type SearchParamRecord = Record<
  string,
  string | string[] | undefined
>;

const MAX_SEARCH_LENGTH = 120;
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

export function parseHistoryFilters(
  params: SearchParamRecord | URLSearchParams,
): HistoryFilters {
  const read = (key: string): string | null =>
    params instanceof URLSearchParams
      ? params.getAll(key).length === 1
        ? params.get(key)
        : null
      : singleValue(params[key]);
  const search = boundedText(read('q'), MAX_SEARCH_LENGTH);
  const provider = boundedText(read('provider'), MAX_PROVIDER_LENGTH);
  const year = read('year');
  const outcome = read('outcome');
  const sortBy = read('sort');

  return {
    search,
    provider: provider || DEFAULT_HISTORY_FILTERS.provider,
    year:
      year && /^\d{4}$/.test(year)
        ? year
        : DEFAULT_HISTORY_FILTERS.year,
    outcome:
      outcome === 'success' || outcome === 'failure'
        ? outcome
        : DEFAULT_HISTORY_FILTERS.outcome,
    sortBy:
      sortBy === 'date-asc'
        ? sortBy
        : DEFAULT_HISTORY_FILTERS.sortBy,
  };
}

export function serializeHistoryFilters(
  filters: HistoryFilters,
): string {
  const normalized = parseHistoryFilters({
    q: filters.search,
    provider: filters.provider,
    year: filters.year,
    outcome: filters.outcome,
    sort: filters.sortBy,
  });
  const params = new URLSearchParams();

  if (normalized.search) params.set('q', normalized.search);
  if (normalized.provider !== DEFAULT_HISTORY_FILTERS.provider) {
    params.set('provider', normalized.provider);
  }
  if (normalized.year !== DEFAULT_HISTORY_FILTERS.year) {
    params.set('year', normalized.year);
  }
  if (normalized.outcome !== DEFAULT_HISTORY_FILTERS.outcome) {
    params.set('outcome', normalized.outcome);
  }
  if (normalized.sortBy !== DEFAULT_HISTORY_FILTERS.sortBy) {
    params.set('sort', normalized.sortBy);
  }

  return params.toString();
}

export function buildHistoryDetailHref(
  launchId: string,
  filters: HistoryFilters,
): string {
  const history = serializeHistoryFilters(filters);
  const base = `/launch/${encodeURIComponent(launchId)}`;
  const params = new URLSearchParams({ from: 'history' });

  if (history) params.set('history', history);

  return `${base}?${params.toString()}`;
}

export function readHistoryReturnQuery(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== 'string' || value.length > 600) return null;
  const query = serializeHistoryFilters(
    parseHistoryFilters(new URLSearchParams(value)),
  );
  return query || null;
}

export function readHistoryReturnFocus(
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

export function buildHistoryReturnHref(
  query: string | null,
  focusId?: string | null,
): string {
  const params = new URLSearchParams(query ?? '');
  const focus = focusId ? parseLaunchId(focusId) : null;

  if (focus && !focus.legacy) params.set('focus', focus.canonicalId);

  const serialized = params.toString();
  return serialized ? `/history?${serialized}` : '/history';
}
