'use client';

import Link from 'next/link';
import Countdown from '@/components/Countdown';
import { useLaunches } from '@/lib/hooks';
import { getLaunchLiveSignal } from '@/lib/format';
import { Launch } from '@/lib/types';

function NextLaunchStatus({
  launch,
  retained = false,
}: {
  launch: Launch;
  retained?: boolean;
}): React.ReactElement {
  const liveSignal = getLaunchLiveSignal(launch);
  const statusLabel = retained
    ? 'LAST KNOWN'
    : launch.isLive
      ? liveSignal === 'mission'
        ? 'IN FLIGHT'
        : 'COVERAGE'
      : 'NEXT';

  return (
    <Link
      href={launch.isLive ? `/watch?id=${launch.id}` : `/launch/${launch.id}`}
      className="flex min-h-11 min-w-0 max-w-full items-center gap-2 whitespace-nowrap text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
    >
      <span
        className={
          retained
            ? 'text-[var(--console-amber)]'
            : launch.isLive
              ? 'text-[var(--console-magenta)]'
              : 'text-[var(--console-cyan)]'
        }
      >
        {statusLabel}
      </span>
      <span aria-hidden="true" className="text-[var(--border-strong)]">/</span>
      <span className="min-w-0 max-w-[48vw] truncate font-medium text-[var(--text-secondary)]">
        {launch.name}
      </span>
      {retained && launch.isLive ? (
        <span className="shrink-0 text-[var(--console-amber)]">
          Coverage unconfirmed
        </span>
      ) : (
        <Countdown
          targetDate={launch.date}
          animated={false}
          precision={launch.datePrecision}
          windowStart={launch.windowStart}
          windowEnd={launch.windowEnd}
          compact
          completedLabel={
            liveSignal === 'mission' ? 'In flight' : undefined
          }
          className={
            launch.isLive
              ? 'shrink-0 !text-[var(--console-magenta)]'
              : 'shrink-0 !font-medium !text-[var(--text-muted)]'
          }
        />
      )}
    </Link>
  );
}

export default function LaunchTicker(): React.ReactElement | null {
  const { launches, loading, error, meta } = useLaunches();

  if (loading) {
    return (
      <div className="mx-5 min-w-0 flex-1 text-center text-[var(--text-muted)]">
        SYNCING SCHEDULE
      </div>
    );
  }

  if (error && launches.length === 0) {
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
      <NextLaunchStatus
        launch={primaryLaunch}
        retained={Boolean(error || meta?.stale)}
      />
    </div>
  );
}
