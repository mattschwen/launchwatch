'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Code2 } from 'lucide-react';
import UTCClock from '@/components/ui/UTCClock';
import { useLiveContext } from '@/lib/contexts';
import { isNavItemActive, PRIMARY_NAV_ITEMS } from './navigation';

export default function TopNav(): React.ReactElement {
  const pathname = usePathname();
  const { hasLiveLaunches, liveCount } = useLiveContext();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[color:var(--surface-header)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-4 lg:px-6">
        <Link
          href="/"
          aria-label="LaunchWatch home"
          className="group flex flex-shrink-0 items-center gap-2 sm:gap-3"
        >
          <Image
            src="/icon-192.svg"
            alt=""
            aria-hidden="true"
            width={44}
            height={44}
            className="h-9 w-9 rounded-full border border-[var(--border-subtle)] object-cover shadow-[0_0_18px_rgba(88,200,232,0.08)] transition-colors group-hover:border-[var(--border-strong)] sm:h-10 sm:w-10"
          />
          <span className="display-title text-sm tracking-[0.14em] sm:text-base">
            <span className="text-[var(--text-primary)]">LAUNCH</span>
            <span className="text-[var(--console-green)]">WATCH</span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <nav aria-label="Primary navigation" className="mr-2 flex items-center gap-1">
            {PRIMARY_NAV_ITEMS.map((link) => {
              const isActive = isNavItemActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors font-[family-name:var(--font-geist-mono)] ${
                    isActive
                      ? 'border-[var(--border-accent)] bg-[var(--surface-accent)] text-[var(--console-green)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{link.label.toUpperCase()}</span>
                  {link.showLiveStatus && hasLiveLaunches && (
                    <span className="relative ml-0.5 flex h-2 w-2" aria-label={`${liveCount} live`}>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-50" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--live)]" />
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="h-6 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
          <a
            href="https://github.com/mattschwen/launchwatch"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View LaunchWatch source code on GitHub"
            className="flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-xs tracking-wider text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]"
          >
            <Code2 size={15} />
            <span className="hidden lg:inline">SOURCE</span>
          </a>

          <div className="h-6 w-px bg-[var(--border-subtle)]" aria-hidden="true" />
          <div className="flex items-center">
            <UTCClock showLabel />
          </div>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {hasLiveLaunches && (
            <Link
              href="/watch"
              className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-bold tracking-wider text-[var(--console-red)] font-[family-name:var(--font-geist-mono)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--live)]" />
              </span>
              LIVE ({liveCount})
            </Link>
          )}
          <a
            href="https://github.com/mattschwen/launchwatch"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View LaunchWatch source code on GitHub"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
          >
            <Code2 size={18} />
          </a>
        </div>
      </div>
    </header>
  );
}
