const DETAIL_QUERY_ERROR = 'Launch detail does not accept query parameters';

export function getLaunchDetailQueryError(
  searchParams: URLSearchParams,
): string | null {
  return searchParams.size > 0 ? DETAIL_QUERY_ERROR : null;
}
