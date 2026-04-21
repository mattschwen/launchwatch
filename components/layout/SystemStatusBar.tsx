'use client';

import { useState, useEffect } from 'react';
import UTCClock from '@/components/ui/UTCClock';
import LaunchTicker from './LaunchTicker';
import { useLiveContext } from '@/lib/contexts';

export default function SystemStatusBar(): React.ReactElement {
  const { liveCount } = useLiveContext();
  const [apiHealth, setApiHealth] = useState<'nominal' | 'degraded'>('nominal');
  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    async function checkHealth(): Promise<void> {
      try {
        const res = await fetch('/api/launches?type=all');
        setApiHealth(res.ok ? 'nominal' : 'degraded');
        setLastRefresh(new Date().toISOString().slice(11, 19));
      } catch {
        setApiHealth('degraded');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 h-8 bg-[var(--bg-primary)]/95 border-t border-[var(--panel-border)] items-center px-4 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider">
      {/* Left: API Health */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className={`status-dot ${apiHealth === 'nominal' ? 'status-dot-nominal' : 'status-dot-critical'}`} />
          <span className={apiHealth === 'nominal' ? 'text-[var(--console-green)]' : 'text-[var(--console-red)]'}>
            {apiHealth === 'nominal' ? 'NOMINAL' : 'DEGRADED'}
          </span>
        </span>
        {lastRefresh && (
          <span className="text-[var(--text-muted)]" suppressHydrationWarning>
            LAST: {lastRefresh}
          </span>
        )}
      </div>

      {/* Center: Ticker */}
      <LaunchTicker />

      {/* Right: UTC Clock + Live Count */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {liveCount > 0 && (
          <span className="flex items-center gap-1.5 text-[var(--console-red)]">
            <span className="status-dot status-dot-critical animate-pulse" />
            {liveCount} LIVE
          </span>
        )}
        <UTCClock showLabel={false} />
      </div>
    </div>
  );
}
