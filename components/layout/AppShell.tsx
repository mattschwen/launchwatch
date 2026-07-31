'use client';

import { ReactNode } from 'react';
import TopNav from './TopNav';
import MobileNav from './MobileNav';
import SystemStatusBar from './SystemStatusBar';
import Footer from '@/components/Footer';
import { LiveProvider } from '@/lib/contexts';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps): React.ReactElement {
  return (
    <LiveProvider>
      <div className="relative z-10 flex min-h-screen flex-col md:pb-11">
        <a
          href="#main-content"
          className="skip-link fixed left-4 top-3 z-[100] inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-elevated)]"
        >
          Skip to main content
        </a>
        <TopNav />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 scroll-mt-20 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] outline-none md:pb-0"
        >
          {children}
        </main>
        <Footer />
        <SystemStatusBar />
        <MobileNav />
      </div>
    </LiveProvider>
  );
}
