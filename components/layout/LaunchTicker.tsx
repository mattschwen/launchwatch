'use client';

import { useLaunches, useCompactCountdown } from '@/lib/hooks';
import { Launch } from '@/lib/types';

function TickerItem({ launch }: { launch: Launch }): React.ReactElement {
  const countdown = useCompactCountdown(launch.date);
  const isLive = launch.isLive;

  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${isLive ? 'text-[var(--console-red)]' : 'text-[var(--text-muted)]'}`}>
      {isLive && <span className="status-dot status-dot-critical animate-pulse" />}
      <span className="font-medium">{launch.name}</span>
      <span className="text-[var(--console-cyan)]">&gt;&gt;</span>
      <span className={isLive ? 'text-[var(--console-red)] font-bold' : 'text-[var(--console-green)]'}>{countdown}</span>
    </span>
  );
}

export default function LaunchTicker(): React.ReactElement | null {
  const { launches } = useLaunches();

  if (launches.length === 0) return null;

  const tickerLaunches = launches.slice(0, 10);

  return (
    <div className="overflow-hidden flex-1 mx-4">
      <div className="flex animate-ticker text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider gap-8">
        {/* Double for seamless loop */}
        {[...tickerLaunches, ...tickerLaunches].map((launch, i) => (
          <TickerItem key={`${launch.id}-${i}`} launch={launch} />
        ))}
      </div>
    </div>
  );
}
