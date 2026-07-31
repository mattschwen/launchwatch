'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UTCClock from '@/components/ui/UTCClock';
import { useLaunchData, useLiveContext } from '@/lib/contexts';
import { getFeedHealth, type FeedHealth } from '@/lib/feed-health';
import { isNavItemActive, PRIMARY_NAV_ITEMS } from './navigation';

const FEED_STATUS: Record<
  FeedHealth,
  {
    label: string;
    compactLabel: string;
    textClass: string;
    dotClass: string;
  }
> = {
  offline: {
    label: 'Feed offline',
    compactLabel: 'Offline',
    textClass: 'text-[var(--console-red)]',
    dotClass: 'bg-[var(--console-red)]',
  },
  syncing: {
    label: 'Syncing feed',
    compactLabel: 'Syncing',
    textClass: 'text-[var(--console-cyan)]',
    dotClass: 'bg-[var(--console-cyan)]',
  },
  refreshing: {
    label: 'Refreshing feed',
    compactLabel: 'Refresh',
    textClass: 'text-[var(--console-cyan)]',
    dotClass: 'bg-[var(--console-cyan)]',
  },
  stale: {
    label: 'Stale cache',
    compactLabel: 'Stale',
    textClass: 'text-[var(--console-amber)]',
    dotClass: 'bg-[var(--console-amber)]',
  },
  partial: {
    label: 'Partial feed',
    compactLabel: 'Partial',
    textClass: 'text-[var(--console-amber)]',
    dotClass: 'bg-[var(--console-amber)]',
  },
  nominal: {
    label: 'Live feed',
    compactLabel: 'Online',
    textClass: 'text-[var(--console-green)]',
    dotClass: 'bg-[var(--console-green)]',
  },
};

export default function TopNav(): React.ReactElement {
  const pathname = usePathname();
  const { hasLiveLaunches, liveCount } = useLiveContext();
  const { launches, loading, refreshing, error, meta } = useLaunchData();
  const feedHealth = getFeedHealth({
    hasLaunches: launches.length > 0,
    loading,
    refreshing,
    error,
    partial: Boolean(meta?.partial),
    stale: Boolean(meta?.stale),
  });
  const feedStatus = FEED_STATUS[feedHealth];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[color:var(--surface-header)] backdrop-blur-xl">
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Launch feed status: ${feedStatus.label}`}
        className="sr-only"
      >
        {feedStatus.label}
      </span>
      <div className="page-container flex h-14 items-center sm:h-[4.375rem]">
        <Link
          href="/"
          aria-label="LaunchWatch home"
          className="group flex min-h-11 flex-shrink-0 items-center"
        >
          <span className="display-title text-[1.25rem] tracking-[-0.035em] text-[var(--text-primary)] transition-colors group-hover:text-white sm:text-[1.3rem]">
            Launch<span className="text-[var(--console-green)]">Watch</span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="ml-10 hidden h-[4.375rem] items-stretch gap-5 md:flex lg:ml-16"
        >
          {PRIMARY_NAV_ITEMS.map((link) => {
            const isActive = isNavItemActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex min-h-11 items-center gap-2 px-2 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--console-green)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--console-green)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={17} />
                <span>{link.label}</span>
                {link.showLiveStatus && hasLiveLaunches && (
                  <span
                    className="relative ml-0.5 flex h-2 w-2"
                    aria-label={`${liveCount} live`}
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--live)]" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <div className="h-6 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
          <span
            className={`flex items-center gap-2 px-2 font-mono text-xs font-medium ${feedStatus.textClass}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${feedStatus.dotClass}`}
            />
            {feedStatus.label}
          </span>
          <UTCClock showLabel className="hardware-clock px-2 py-1" />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1 md:hidden">
          {hasLiveLaunches && (
            <Link
              href="/watch"
              aria-label={`${liveCount} live launches`}
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-bold tracking-wider text-[var(--console-magenta)] font-[family-name:var(--font-geist-mono)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--live)]" />
              </span>
              <span className="hidden min-[360px]:inline">LIVE ({liveCount})</span>
            </Link>
          )}
          {feedHealth !== 'nominal' ? (
            <span
              className={`flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${feedStatus.textClass}`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${feedStatus.dotClass}`}
              />
              <span className="hidden min-[370px]:inline">
                {feedStatus.compactLabel}
              </span>
            </span>
          ) : null}
          <UTCClock
            showLabel={false}
            className="hardware-clock h-10 px-2 text-[var(--console-cyan)]"
          />
        </div>
      </div>
    </header>
  );
}
