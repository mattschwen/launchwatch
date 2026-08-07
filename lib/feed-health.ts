export type FeedHealth =
  | 'offline'
  | 'syncing'
  | 'refreshing'
  | 'stale'
  | 'partial'
  | 'nominal';

interface FeedHealthInput {
  hasLaunches: boolean;
  online: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  partial: boolean;
  stale: boolean;
}

export function getFeedHealth({
  hasLaunches,
  online,
  loading,
  refreshing,
  error,
  partial,
  stale,
}: FeedHealthInput): FeedHealth {
  if (!online) return 'offline';
  if (error && !hasLaunches) return 'offline';
  if (loading && !hasLaunches) return 'syncing';
  if (refreshing) return 'refreshing';
  if (stale) return 'stale';
  if (partial || error) return 'partial';
  return 'nominal';
}
