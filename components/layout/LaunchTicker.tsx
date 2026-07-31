'use client';

import Link from 'next/link';
import Countdown from '@/components/Countdown';
import { useLaunches } from '@/lib/hooks';
import { Launch } from '@/lib/types';

function NextLaunchStatus({ launch }: { launch: Launch }): React.ReactElement {
  return (
    <Link
      href={launch.isLive ? `/watch?id=${launch.id}` : `/launch/${launch.id}`}
      className="flex min-h-11 min-w-0 max-w-full items-center gap-2 whitespace-nowrap text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
    >
      <span className={launch.isLive ? 'text-[var(--console-magenta)]' : 'text-[var(--console-cyan)]'}>
        {launch.isLive ? 'LIVE' : 'NEXT'}
      </span>
      <span aria-hidden="true" className="text-[var(--border-strong)]">/</span>
      <span className="min-w-0 max-w-[48vw] truncate font-medium text-[var(--text-secondary)]">
        {launch.name}
      </span>
      <Countdown
        targetDate={launch.date}
        precision={launch.datePrecision}
        compact
        completedLabel={launch.isLive ? 'In progress' : 'Window open'}
        className={launch.isLive ? 'shrink-0 !text-[var(--console-magenta)]' : 'shrink-0'}
      />
    </Link>
  );
}

export default function LaunchTicker(): React.ReactElement | null {
  const { launches, loading, error } = useLaunches();

  if (loading) {
    return (
      <div className="mx-5 min-w-0 flex-1 text-center text-[var(--text-muted)]">
        SYNCING SCHEDULE
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-5 min-w-0 flex-1 text-center text-[var(--console-amber)]">
        SCHEDULE DEGRADED
      </div>
    );
  }

  const primaryLaunch = launches.find((launch) => launch.isLive) || launches[0];

  if (!primaryLaunch) {
    return (
      <div className="mx-5 min-w-0 flex-1 text-center text-[var(--text-muted)]">
        NO SCHEDULED LAUNCHES
      </div>
    );
  }

  return (
    <div className="mx-5 flex min-w-0 flex-1 justify-center overflow-hidden">
      <NextLaunchStatus launch={primaryLaunch} />
    </div>
  );
}
