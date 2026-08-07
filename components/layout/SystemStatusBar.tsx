'use client';

import UTCClock from '@/components/ui/UTCClock';
import LaunchTicker from './LaunchTicker';
import { useLaunchData, useLiveContext } from '@/lib/contexts';
import { getFeedHealth } from '@/lib/feed-health';

export default function SystemStatusBar(): React.ReactElement {
  const { liveCount } = useLiveContext();
  const { launches, online, loading, refreshing, error, meta } = useLaunchData();
  const feedHealth = getFeedHealth({
    hasLaunches: launches.length > 0,
    online,
    loading,
    refreshing,
    error,
    partial: Boolean(meta?.partial),
    stale: Boolean(meta?.stale),
  });
  const statusLabel = feedHealth === 'offline'
    ? launches.length > 0
      ? 'OFFLINE · RETAINED'
      : 'FEED OFFLINE'
    : feedHealth === 'syncing'
      ? 'SYNCING FEED'
      : feedHealth === 'refreshing'
        ? 'REFRESHING'
        : feedHealth === 'stale'
          ? 'STALE CACHE'
          : feedHealth === 'partial'
            ? 'PARTIAL FEED'
            : 'MISSION FEED';
  const statusClass = feedHealth === 'offline'
    ? 'status-dot-critical'
    : feedHealth === 'syncing'
      ? 'status-dot-inactive'
      : feedHealth === 'refreshing' ||
          feedHealth === 'stale' ||
          feedHealth === 'partial'
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
            {liveCount} LIVE SIGNAL{liveCount === 1 ? '' : 'S'}
          </span>
        )}
        <UTCClock showLabel={false} />
      </div>
    </aside>
  );
}
