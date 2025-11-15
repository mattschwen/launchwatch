'use client';

import { useLiveLaunches } from '@/lib/hooks';
import LiveNow from './LiveNow';

export default function LiveLaunches() {
  const { liveLaunches, loading } = useLiveLaunches();

  if (loading) {
    return null;
  }

  if (liveLaunches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {liveLaunches.map((launch) => (
        <LiveNow key={launch.id} launch={launch} />
      ))}
    </div>
  );
}
