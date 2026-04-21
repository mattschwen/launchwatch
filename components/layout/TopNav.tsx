'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Code2, Home, Tv } from 'lucide-react';
import UTCClock from '@/components/ui/UTCClock';
import { useLiveContext } from '@/lib/contexts';

export default function TopNav(): React.ReactElement {
  const pathname = usePathname();
  const { hasLiveLaunches, liveCount } = useLiveContext();

  const navLinks = [
    { href: '/', label: 'HOME', icon: Home },
    { href: '/watch', label: 'WATCH', icon: Tv, showLiveDot: true },
  ];

  return (
    <header className="w-full sticky top-0 z-50 border-b border-[rgba(0,255,136,0.15)] bg-[var(--bg-primary)]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between h-14 sm:h-16">
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <Image
            src="/newlogo.jpeg"
            alt="LaunchWatch"
            width={44}
            height={44}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-transform group-hover:scale-105"
          />
          <span className="display-title text-sm sm:text-base tracking-[0.18em]">
            <span className="text-[var(--console-cyan)]">LAUNCH</span><span className="text-[var(--console-green)]">WATCH</span>
          </span>
        </Link>

        {/* Desktop Nav + Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Nav links */}
          <nav className="flex items-center gap-1 mr-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded text-xs font-[family-name:var(--font-geist-mono)] font-medium tracking-wider uppercase transition-all ${
                    isActive
                      ? 'text-[var(--console-green)] bg-[var(--console-green)]/10 border border-[var(--console-green)]/20'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-transparent'
                  }`}
                >
                  <Icon size={14} />
                  <span>{link.label}</span>
                  {link.showLiveDot && hasLiveLaunches && (
                    <span className="flex h-2 w-2 ml-0.5">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[var(--live)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--live)]" />
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="w-px h-6 bg-[var(--panel-border)]" />

          {/* GitHub */}
          <a
            href="https://github.com/mattschwen/launchwatch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)] hover:text-[var(--console-green)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <Code2 size={15} />
            <span className="hidden lg:inline">SOURCE</span>
          </a>

          {/* Divider */}
          <div className="w-px h-6 bg-[var(--panel-border)]" />

          {/* UTC Clock + Author */}
          <div className="flex flex-col items-end">
            <UTCClock showLabel />
            <a
              href="https://github.com/mattschwen"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--text-secondary)] font-[family-name:var(--font-geist-mono)] tracking-wider hover:text-[var(--console-cyan)] transition-colors"
            >
              by Matthew Schwen
            </a>
          </div>
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-2 md:hidden">
          {hasLiveLaunches && (
            <Link
              href="/watch"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[var(--console-red)] text-[10px] font-[family-name:var(--font-geist-mono)] font-bold tracking-wider animate-pulse"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--live)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--live)]" />
              </span>
              LIVE ({liveCount})
            </Link>
          )}
          <a
            href="https://github.com/mattschwen/launchwatch"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--console-green)] transition-colors"
          >
            <Code2 size={18} />
          </a>
        </div>
      </div>
    </header>
  );
}
