'use client';

import { ReactNode } from 'react';
import TopNav from './TopNav';
import MobileNav from './MobileNav';
import SystemStatusBar from './SystemStatusBar';
import Footer from '@/components/Footer';
import NotificationPrompt from '@/components/NotificationPrompt';
import { LiveProvider } from '@/lib/contexts';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps): React.ReactElement {
  return (
    <LiveProvider>
      <div className="min-h-screen flex flex-col relative z-10">
        <TopNav />
        <main className="flex-1 pb-20 md:pb-10">
          {children}
        </main>
        <Footer />
        {/* Spacer for fixed bottom bars */}
        <div className="hidden md:block h-8" />
        <SystemStatusBar />
        <MobileNav />
        <NotificationPrompt />
      </div>
    </LiveProvider>
  );
}
