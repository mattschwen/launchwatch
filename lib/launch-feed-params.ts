export type LaunchFeedRequestType = 'all' | 'live' | 'next' | 'history';

export type LaunchFeedQueryResult =
  | {
      type: Exclude<LaunchFeedRequestType, 'history'>;
      historyLimit: null;
      error: null;
    }
  | {
      type: 'history';
      historyLimit: number;
      error: null;
    }
  | {
      type: null;
      historyLimit: null;
      error: string;
    };

const ALLOWED_QUERY_KEYS = new Set(['type', 'limit']);

function invalid(error: string): LaunchFeedQueryResult {
  return {
    type: null,
    historyLimit: null,
    error,
  };
}

function isLaunchFeedRequestType(
  value: string,
): value is LaunchFeedRequestType {
  return (
    value === 'all' ||
    value === 'live' ||
    value === 'next' ||
    value === 'history'
  );
}

export function parseLaunchFeedQuery(
  searchParams: URLSearchParams,
  maxHistoryLimit: number,
): LaunchFeedQueryResult {
  const keys = [...searchParams.keys()];
  if (keys.some((key) => !ALLOWED_QUERY_KEYS.has(key))) {
    return invalid(
      'Only type and the history limit parameters are accepted',
    );
  }

  const typeValues = searchParams.getAll('type');
  if (typeValues.length > 1) {
    return invalid('Only one type parameter is accepted');
  }

  const typeValue = typeValues[0] ?? 'all';
  if (!isLaunchFeedRequestType(typeValue)) {
    return invalid(
      'Invalid type parameter. Use: all, live, next, or history',
    );
  }

  const limitValues = searchParams.getAll('limit');
  if (limitValues.length > 1) {
    return invalid('Only one history limit parameter is accepted');
  }
  if (typeValue !== 'history' && limitValues.length > 0) {
    return invalid('The limit parameter is only available for history');
  }

  const rawLimit = limitValues[0];
  if (typeValue !== 'history') {
    return {
      type: typeValue,
      historyLimit: null,
      error: null,
    };
  }
  if (rawLimit === undefined) {
    return {
      type: typeValue,
      historyLimit: 50,
      error: null,
    };
  }
  if (!/^\d+$/.test(rawLimit)) {
    return invalid(
      `Invalid limit parameter. Use an integer from 1 to ${maxHistoryLimit}`,
    );
  }

  const historyLimit = Number.parseInt(rawLimit, 10);
  if (historyLimit < 1 || historyLimit > maxHistoryLimit) {
    return invalid(
      `Invalid limit parameter. Use an integer from 1 to ${maxHistoryLimit}`,
    );
  }

  return {
    type: typeValue,
    historyLimit,
    error: null,
  };
}
