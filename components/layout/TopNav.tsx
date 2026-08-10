'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import UTCClock from '@/components/ui/UTCClock';
import {
  useDetailNavigationContext,
  useLaunchData,
  useLiveContext,
} from '@/lib/contexts';
import { getFeedHealth, type FeedHealth } from '@/lib/feed-health';
import {
  isNavItemActive,
  PRIMARY_NAV_ITEMS,
  signalHistoryFilterReset,
  signalScheduleFilterReset,
  signalWatchSelectionReset,
} from './navigation';

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

function revealProviderStatus(): void {
  const sourceFeeds = document.getElementById('launch-data-sources');
  if (!sourceFeeds) return;

  const eventController = new AbortController();
  const observer = new ResizeObserver(() => {
    if (document.activeElement !== sourceFeeds) {
      stopTracking();
      return;
    }
    sourceFeeds.scrollIntoView({ behavior: 'auto', block: 'center' });
  });
  const stopTracking = (): void => {
    observer.disconnect();
    eventController.abort();
    window.clearTimeout(timeoutId);
  };

  sourceFeeds.focus({ preventScroll: true });
  sourceFeeds.scrollIntoView({ behavior: 'auto', block: 'center' });
  observer.observe(document.body);
  const cancelOptions = {
    capture: true,
    once: true,
    signal: eventController.signal,
  };
  window.addEventListener('keydown', stopTracking, cancelOptions);
  window.addEventListener('pointerdown', stopTracking, cancelOptions);
  window.addEventListener('touchstart', stopTracking, cancelOptions);
  window.addEventListener('wheel', stopTracking, {
    ...cancelOptions,
    passive: true,
  });
  const timeoutId = window.setTimeout(stopTracking, 5_000);
}

function TopNavContents({
  detailSource,
}: {
  detailSource: string | null;
}): React.ReactElement {
  const pathname = usePathname();
  const { source: inferredDetailSource } = useDetailNavigationContext();
  const { hasLiveLaunches, liveCount } = useLiveContext();
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
  const feedStatus = FEED_STATUS[feedHealth];
  const feedStatusLabel = `${feedStatus.label} — view provider status`;
  const activeSurface = PRIMARY_NAV_ITEMS.find((item) =>
    isNavItemActive(
      pathname,
      item.href,
      detailSource ?? inferredDetailSource,
    ),
  );

  return (
    <header className="top-nav-shell safe-area-pt sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[color:var(--surface-header)] backdrop-blur-xl">
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Launch feed status: ${feedStatus.label}`}
        className="sr-only"
      >
        {feedStatus.label}
      </span>
      <div className="header-command-deck page-container flex h-14 items-center sm:h-[4.375rem]">
        <Link
          href="/"
          aria-label="LaunchWatch home"
          onClick={signalScheduleFilterReset}
          className="brand-lockup group flex min-h-11 flex-shrink-0 items-center gap-2.5"
        >
          <span className="brand-emblem flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
            <Image
              src="/brand/logo_launchwatch_tracked-ascent_20260726_color.svg"
              alt=""
              width="32"
              height="32"
            />
          </span>
          <span className="brand-copy min-w-0">
            <span className="brand-wordmark display-title block whitespace-nowrap text-[1.25rem] tracking-[-0.035em] text-[var(--text-primary)] transition-colors group-hover:text-white sm:text-[1.3rem]">
              Launch<span className="text-[var(--console-green)]">Watch</span>
            </span>
            <span className="brand-kicker hidden items-center gap-1.5 whitespace-nowrap font-mono text-[0.56rem] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] min-[350px]:flex">
              <span>Mission ops</span>
              <span aria-hidden="true" className="text-[var(--border-strong)]">{'//'}</span>
              <span className="text-[var(--console-cyan)]">
                {activeSurface?.descriptor ?? 'Console'}
              </span>
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="desktop-primary-nav ml-8 hidden h-[4.375rem] items-center gap-1.5 md:flex lg:ml-12"
        >
          {PRIMARY_NAV_ITEMS.map((link) => {
            const isActive = isNavItemActive(
              pathname,
              link.href,
              detailSource ?? inferredDetailSource,
            );
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                onClick={
                  link.href === '/'
                    ? signalScheduleFilterReset
                    : link.href === '/watch'
                      ? signalWatchSelectionReset
                    : link.href === '/history'
                      ? signalHistoryFilterReset
                      : undefined
                }
                aria-current={isActive ? 'page' : undefined}
                className={`command-nav-link relative grid min-h-11 grid-cols-[auto_auto_1fr] items-center gap-x-2 px-3 py-1.5 transition-colors ${
                  isActive
                    ? 'command-nav-link-active text-[var(--console-green)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="command-nav-index self-start font-mono text-[0.54rem] font-semibold tracking-[0.12em] text-[var(--text-muted)]">
                  {link.code}
                </span>
                <Icon className="command-nav-icon row-span-2" size={17} />
                <span className="command-nav-label self-end text-sm font-semibold leading-none">
                  {link.label}
                </span>
                <span className="command-nav-descriptor col-start-3 self-start font-mono text-[0.54rem] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {link.descriptor}
                </span>
                {link.showLiveStatus && hasLiveLaunches && (
                  <span
                    className="command-nav-live absolute right-1.5 top-1.5 flex h-2 w-2"
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

        <div className="header-instruments ml-auto hidden items-stretch gap-1.5 md:flex">
          <button
            type="button"
            onClick={revealProviderStatus}
            aria-label={feedStatusLabel}
            title="View provider status"
            className={`header-instrument-cell header-feed-status inline-flex min-h-11 flex-col items-start justify-center px-3 font-mono transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${feedStatus.textClass}`}
          >
            <span className="header-instrument-label">Uplink</span>
            <span className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em]">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${feedStatus.dotClass}`}
              />
              <span className="header-feed-status-label">{feedStatus.label}</span>
            </span>
          </button>
          <div className="header-instrument-cell flex min-w-[5.5rem] flex-col items-start justify-center px-3">
            <span className="header-instrument-label">Coordinated UTC</span>
            <UTCClock
              compact
              showIndicator={false}
              showLabel={false}
              className="header-utc-clock min-w-0"
            />
          </div>
        </div>

        <div className="header-instruments ml-auto flex min-w-0 items-center gap-1 md:hidden">
          {hasLiveLaunches && (
            <Link
              href="/watch"
              aria-label={`${liveCount} active live signal${liveCount === 1 ? '' : 's'}`}
              className="mobile-header-signal flex min-h-11 min-w-11 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--console-magenta)] font-[family-name:var(--font-geist-mono)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--live)]" />
              </span>
              <span>LIVE</span>
            </Link>
          )}
          <button
            type="button"
            onClick={revealProviderStatus}
            aria-label={feedStatusLabel}
            title="View provider status"
            className={`mobile-header-signal inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${feedStatus.textClass}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${feedStatus.dotClass}`}
            />
            <span>
              {feedStatus.compactLabel}
            </span>
          </button>
          <UTCClock
            compact
            showIndicator={false}
            showLabel={false}
            className="hardware-clock mobile-header-clock hidden h-10 min-w-0 text-[var(--console-cyan)] min-[360px]:flex"
          />
        </div>
      </div>
    </header>
  );
}

function ContextAwareTopNav(): React.ReactElement {
  const searchParams = useSearchParams();
  return <TopNavContents detailSource={searchParams.get('from')} />;
}

export default function TopNav(): React.ReactElement {
  return (
    <Suspense fallback={<TopNavContents detailSource={null} />}>
      <ContextAwareTopNav />
    </Suspense>
  );
}
