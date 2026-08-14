'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useDetailNavigationContext,
  useLiveContext,
} from '@/lib/contexts';
import {
  getPrimaryNavAccessibleLabel,
  isNavItemActive,
  PRIMARY_NAV_ITEMS,
  signalHistoryFilterReset,
  signalScheduleFilterReset,
  signalWatchSelectionReset,
} from './navigation';

function MobileNavContents({
  detailSource,
}: {
  detailSource: string | null;
}): React.ReactElement {
  const pathname = usePathname();
  const { source: inferredDetailSource } = useDetailNavigationContext();
  const { hasLiveLaunches, liveCount } = useLiveContext();

  return (
    <nav
      aria-label="Primary navigation"
      className="mobile-primary-nav safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[color:var(--surface-header)] backdrop-blur-xl md:hidden"
    >
      <div className="mobile-command-dock mx-auto grid h-[4.25rem] max-w-lg grid-cols-3 items-stretch gap-1 pl-[max(0.5rem,var(--safe-area-left))] pr-[max(0.5rem,var(--safe-area-right))]">
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
              aria-label={getPrimaryNavAccessibleLabel(link, liveCount)}
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
              className={`mobile-command-link relative my-1.5 grid min-h-[44px] grid-cols-[auto_auto] content-center items-center justify-center gap-x-2 px-2 py-1 transition-colors ${
                isActive
                  ? 'mobile-command-link-active text-[var(--console-green)]'
                  : 'text-[var(--text-muted)] active:bg-[var(--surface-subtle)] active:text-[var(--text-primary)]'
              }`}
            >
              <span className="mobile-command-index self-end font-mono text-[0.5rem] font-semibold tracking-[0.14em] text-[var(--text-muted)]">
                {link.code}
              </span>
              <div className="relative row-span-2">
                <Icon size={20} />
                {link.showLiveStatus && hasLiveLaunches && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--live)]" />
                  </span>
                )}
              </div>
              <span className="self-start text-[10px] font-semibold uppercase tracking-[0.13em] font-[family-name:var(--font-geist-mono)]">
                {link.label.toUpperCase()}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ContextAwareMobileNav(): React.ReactElement {
  const searchParams = useSearchParams();
  return <MobileNavContents detailSource={searchParams.get('from')} />;
}

export default function MobileNav(): React.ReactElement {
  return (
    <Suspense fallback={<MobileNavContents detailSource={null} />}>
      <ContextAwareMobileNav />
    </Suspense>
  );
}
