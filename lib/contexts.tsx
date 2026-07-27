'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Launch } from './types';
import { checkAndNotify, clearOldNotificationFlags } from './notifications';

export interface LaunchFeedMeta {
  generatedAt?: string;
  partial?: boolean;
  stale?: boolean;
  providers?: Record<string, unknown> | unknown[];
}

interface LaunchDataContextValue {
  launches: Launch[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  meta: LaunchFeedMeta | null;
  refresh: () => Promise<void>;
}

const LaunchDataContext = createContext<LaunchDataContextValue | null>(null);

function readLaunches(payload: unknown): {
  launches: Launch[];
  meta: LaunchFeedMeta | null;
} {
  if (Array.isArray(payload)) {
    return { launches: payload as Launch[], meta: null };
  }

  if (!payload || typeof payload !== 'object') {
    return { launches: [], meta: null };
  }

  const record = payload as Record<string, unknown>;
  const nestedData =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : null;

  const launches = Array.isArray(record.launches)
    ? (record.launches as Launch[])
    : Array.isArray(record.data)
      ? (record.data as Launch[])
      : Array.isArray(nestedData?.launches)
        ? (nestedData.launches as Launch[])
        : [];

  const meta =
    record.meta && typeof record.meta === 'object'
      ? (record.meta as LaunchFeedMeta)
      : null;

  return { launches, meta };
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'string') return record.error;
  if (typeof record.message === 'string') return record.message;
  return fallback;
}

export function LaunchDataProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<LaunchFeedMeta | null>(null);
  const launchesRef = useRef<Launch[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const lastFetchedAtRef = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    if (requestRef.current) return requestRef.current;

    const hasData = launchesRef.current.length > 0;
    if (hasData) setRefreshing(true);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const request = (async (): Promise<void> => {
      try {
        const response = await fetch('/api/launches?type=all', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            messageFromPayload(payload, `Launch feed unavailable (${response.status})`)
          );
        }

        const result = readLaunches(payload);
        launchesRef.current = result.launches;
        setLaunches(result.launches);
        setMeta(result.meta);
        setError(null);
        lastFetchedAtRef.current = Date.now();

        void checkAndNotify(result.launches);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load the launch feed'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    requestRef.current = request;
    try {
      await request;
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearOldNotificationFlags();
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 2 * 60 * 1000);

    const revalidateIfStale = (): void => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      if (Date.now() - lastFetchedAtRef.current > 60_000) {
        void refresh();
      }
    };

    window.addEventListener('online', revalidateIfStale);
    document.addEventListener('visibilitychange', revalidateIfStale);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', revalidateIfStale);
      document.removeEventListener('visibilitychange', revalidateIfStale);
      controllerRef.current?.abort();
    };
  }, [refresh]);

  const value = useMemo<LaunchDataContextValue>(
    () => ({ launches, loading, refreshing, error, meta, refresh }),
    [launches, loading, refreshing, error, meta, refresh]
  );

  return (
    <LaunchDataContext.Provider value={value}>
      {children}
    </LaunchDataContext.Provider>
  );
}

export function useLaunchData(): LaunchDataContextValue {
  const value = useContext(LaunchDataContext);
  if (!value) {
    throw new Error('useLaunchData must be used within LaunchDataProvider');
  }
  return value;
}

interface LiveContextValue {
  hasLiveLaunches: boolean;
  liveCount: number;
}

export function useLiveContext(): LiveContextValue {
  const { launches } = useLaunchData();
  const liveCount = launches.filter((launch) => launch.isLive).length;
  return { hasLiveLaunches: liveCount > 0, liveCount };
}

/**
 * Backwards-compatible provider name used by the app shell.
 * All launch selectors now share this single feed.
 */
export function LiveProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <LaunchDataProvider>{children}</LaunchDataProvider>;
}
