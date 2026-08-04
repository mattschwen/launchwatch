'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLiveContext } from '@/lib/contexts';
import {
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
  const { hasLiveLaunches } = useLiveContext();

  return (
    <nav
      aria-label="Primary navigation"
      className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[color:var(--surface-header)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch justify-around px-2">
        {PRIMARY_NAV_ITEMS.map((link) => {
          const isActive = isNavItemActive(
            pathname,
            link.href,
            detailSource,
          );
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
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
              className={`relative mx-0.5 flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] py-2 transition-colors ${
                isActive
                  ? 'bg-[var(--surface-accent)] text-[var(--console-green)]'
                  : 'text-[var(--text-muted)] active:bg-[var(--surface-subtle)] active:text-[var(--text-primary)]'
              }`}
            >
              <div className="relative">
                <Icon size={20} />
                {link.showLiveStatus && hasLiveLaunches && (
                  <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--live)]" />
                    <span className="sr-only">Live launch available</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] font-[family-name:var(--font-geist-mono)]">
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
