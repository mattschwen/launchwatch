export interface HistoryFilters {
  search: string;
  provider: string;
  year: string;
  outcome: string;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  search: '',
  provider: 'all',
  year: 'all',
  outcome: 'all',
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

  return params.toString();
}

export function buildHistoryDetailHref(
  launchId: string,
  filters: HistoryFilters,
): string {
  const history = serializeHistoryFilters(filters);
  const base = `/launch/${encodeURIComponent(launchId)}`;
  if (!history) return base;

  return `${base}?${new URLSearchParams({
    from: 'history',
    history,
  }).toString()}`;
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

export function buildHistoryReturnHref(query: string): string {
  return `/history?${query}`;
}
