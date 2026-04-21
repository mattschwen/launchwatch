'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, Home, Tv } from 'lucide-react';
import { useLiveContext } from '@/lib/contexts';

export default function MobileNav(): React.ReactElement {
  const pathname = usePathname();
  const { hasLiveLaunches } = useLiveContext();

  const navLinks = [
    { href: '/', label: 'HOME', icon: Home },
    { href: '/watch', label: 'WATCH', icon: Tv, showLiveDot: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(0,255,136,0.15)] bg-[var(--bg-primary)] safe-area-pb">
      <div className="flex items-center justify-around h-16 px-4">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg mx-1 transition-all ${
                isActive
                  ? 'text-[var(--console-green)] bg-[var(--console-green)]/8'
                  : 'text-[var(--text-muted)] active:bg-[var(--bg-tertiary)]'
              }`}
            >
              <div className="relative">
                <Icon size={22} />
                {link.showLiveDot && hasLiveLaunches && (
                  <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--live)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--live)]" />
                  </span>
                )}
              </div>
              <span className="text-[10px] font-[family-name:var(--font-geist-mono)] font-medium tracking-wider">
                {link.label}
              </span>
            </Link>
          );
        })}
        {/* GitHub link */}
        <a
          href="https://github.com/mattschwen/launchwatch"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg mx-1 text-[var(--text-muted)] active:bg-[var(--bg-tertiary)] transition-all"
        >
          <Code2 size={22} />
          <span className="text-[10px] font-[family-name:var(--font-geist-mono)] font-medium tracking-wider">
            SOURCE
          </span>
        </a>
      </div>
    </nav>
  );
}
