'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LiveContextValue {
  hasLiveLaunches: boolean;
  liveCount: number;
}

const LiveContext = createContext<LiveContextValue>({
  hasLiveLaunches: false,
  liveCount: 0,
});

export function useLiveContext(): LiveContextValue {
  return useContext(LiveContext);
}

export function LiveProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [hasLiveLaunches, setHasLiveLaunches] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    async function checkLive(): Promise<void> {
      try {
        const response = await fetch('/api/launches?type=live');
        const result = await response.json();
        const launches = result.launches || [];
        setHasLiveLaunches(launches.length > 0);
        setLiveCount(launches.length);
      } catch {
        // Silently fail - nav indicator just won't show
      }
    }

    checkLive();
    const interval = setInterval(checkLive, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <LiveContext.Provider value={{ hasLiveLaunches, liveCount }}>
      {children}
    </LiveContext.Provider>
  );
}
