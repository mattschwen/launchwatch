'use client';

import UTCClock from '@/components/ui/UTCClock';
import LaunchTicker from './LaunchTicker';
import { useLaunchData, useLiveContext } from '@/lib/contexts';

export default function SystemStatusBar(): React.ReactElement {
  const { liveCount } = useLiveContext();
  const { launches, loading, refreshing, error, meta } = useLaunchData();
  const unavailable = Boolean(error && launches.length === 0);
  const caution = Boolean(
    !unavailable && (error || meta?.partial || meta?.stale || refreshing),
  );
  const statusLabel = unavailable
    ? 'FEED OFFLINE'
    : loading
      ? 'SYNCING FEED'
      : refreshing
        ? 'REFRESHING'
        : meta?.stale
          ? 'STALE CACHE'
          : meta?.partial || error
            ? 'PARTIAL FEED'
            : 'MISSION FEED';
  const statusClass = unavailable
    ? 'status-dot-critical'
    : loading
      ? 'status-dot-inactive'
      : caution
        ? 'status-dot-caution'
        : 'status-dot-nominal';

  return (
    <aside
      aria-label="Mission status"
      className="system-status-bar fixed bottom-0 left-0 right-0 z-40 hidden h-11 items-center border-t border-[var(--border-subtle)] bg-[color:var(--surface-header)] px-4 text-[11px] tracking-[0.1em] backdrop-blur-xl font-[family-name:var(--font-geist-mono)] lg:flex"
    >
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className={`status-dot ${statusClass}`} aria-hidden="true" />
        <span className="text-[var(--text-secondary)]">{statusLabel}</span>
      </div>

      <LaunchTicker />

      <div className="flex flex-shrink-0 items-center gap-3">
        {liveCount > 0 && (
          <span className="flex items-center gap-1.5 font-semibold text-[var(--console-magenta)]">
            <span className="status-dot status-dot-live" aria-hidden="true" />
            {liveCount} LIVE
          </span>
        )}
        <UTCClock showLabel={false} />
      </div>
    </aside>
  );
}
