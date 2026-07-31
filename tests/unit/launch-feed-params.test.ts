import { describe, expect, it } from 'vitest';
import { parseLaunchFeedQuery } from '@/lib/launch-feed-params';

const MAX_HISTORY_LIMIT = 100;

function parse(query: string) {
  return parseLaunchFeedQuery(
    new URLSearchParams(query),
    MAX_HISTORY_LIMIT,
  );
}

describe('launch feed query parameters', () => {
  it.each([
    ['', 'all', null],
    ['type=all', 'all', null],
    ['type=live', 'live', null],
    ['type=next', 'next', null],
    ['type=history', 'history', 50],
    ['type=history&limit=1', 'history', 1],
    ['type=history&limit=100', 'history', 100],
  ] as const)('parses the canonical query %j', (query, type, historyLimit) => {
    expect(parse(query)).toEqual({
      type,
      historyLimit,
      error: null,
    });
  });

  it.each([
    [
      'type=all&tracking=campaign',
      'Only type and the history limit parameters are accepted',
    ],
    ['type=all&type=history', 'Only one type parameter is accepted'],
    [
      'type=history&limit=20&limit=40',
      'Only one history limit parameter is accepted',
    ],
    [
      'type=all&limit=20',
      'The limit parameter is only available for history',
    ],
    [
      'type=',
      'Invalid type parameter. Use: all, live, next, or history',
    ],
    [
      'type=history&limit=0',
      'Invalid limit parameter. Use an integer from 1 to 100',
    ],
    [
      'type=history&limit=1.5',
      'Invalid limit parameter. Use an integer from 1 to 100',
    ],
    [
      'type=history&limit=101',
      'Invalid limit parameter. Use an integer from 1 to 100',
    ],
  ])('rejects the non-canonical query %j', (query, error) => {
    expect(parse(query)).toEqual({
      type: null,
      historyLimit: null,
      error,
    });
  });
});
