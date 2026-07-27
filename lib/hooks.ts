'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Launch, LaunchIntel, RocketFact } from './types';
import { useLaunchData } from './contexts';

const clockListeners = new Set<() => void>();
let clockInterval: ReturnType<typeof setInterval> | null = null;
let currentTime = Date.now();

function subscribeToClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (!clockInterval) {
    clockInterval = setInterval(() => {
      currentTime = Date.now();
      clockListeners.forEach((notify) => notify());
    }, 1000);
  }

  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  };
}

function getClockSnapshot(): number {
  return currentTime;
}

function getServerClockSnapshot(): number {
  return currentTime;
}

export function useCurrentTime(): number {
  return useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  );
}

function checkedMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  return typeof record.error === 'string'
    ? record.error
    : typeof record.message === 'string'
      ? record.message
      : fallback;
}

function extractLaunch(payload: unknown): Launch | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (record.launch && typeof record.launch === 'object') {
    return record.launch as Launch;
  }
  if (
    record.data &&
    typeof record.data === 'object' &&
    !Array.isArray(record.data)
  ) {
    const nested = record.data as Record<string, unknown>;
    if (nested.launch && typeof nested.launch === 'object') {
      return nested.launch as Launch;
    }
    if (typeof nested.id === 'string') return nested as unknown as Launch;
  }
  return typeof record.id === 'string' ? (record as unknown as Launch) : null;
}

export function useLaunches() {
  const data = useLaunchData();
  return data;
}

export function useLiveLaunches() {
  const data = useLaunchData();
  const liveLaunches = useMemo(
    () => data.launches.filter((launch) => launch.isLive),
    [data.launches]
  );
  return {
    liveLaunches,
    loading: data.loading,
    refreshing: data.refreshing,
    error: data.error,
    meta: data.meta,
    refresh: data.refresh,
  };
}

export function useNextLaunch() {
  const data = useLaunchData();
  const nextLaunch = useMemo(() => {
    return (
      data.launches.find(
        (launch) =>
          launch.isLive ||
          launch.status === 'upcoming' ||
          launch.status === 'tbd'
      ) ?? null
    );
  }, [data.launches]);

  return {
    nextLaunch,
    loading: data.loading,
    refreshing: data.refreshing,
    error: data.error,
    meta: data.meta,
    refresh: data.refresh,
  };
}

export function useLaunchById(id: string | null | undefined) {
  const { launches, loading: feedLoading } = useLaunchData();
  const feedLaunch = useMemo(
    () => (id ? launches.find((launch) => launch.id === id) ?? null : null),
    [id, launches]
  );
  const [remoteLaunch, setRemoteLaunch] = useState<Launch | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setRemoteLaunch(null);
      setLoading(false);
      setNotFound(false);
      setError(null);
      return;
    }

    if (feedLaunch) {
      setRemoteLaunch(null);
      setLoading(false);
      setNotFound(false);
      setError(null);
      return;
    }

    if (feedLoading) return;

    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);

    async function fetchLaunch(): Promise<void> {
      try {
        const response = await fetch(`/api/launches/${encodeURIComponent(id!)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const payload: unknown = await response.json().catch(() => null);

        if (response.status === 404) {
          setRemoteLaunch(null);
          setNotFound(true);
          setError(null);
          return;
        }
        if (!response.ok) {
          throw new Error(
            checkedMessage(payload, `Mission unavailable (${response.status})`)
          );
        }

        const launch = extractLaunch(payload);
        if (!launch) throw new Error('Mission response was incomplete');
        setRemoteLaunch(launch);
        setNotFound(false);
        setError(null);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load this mission'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchLaunch();
    return () => controller.abort();
  }, [feedLaunch, feedLoading, id]);

  return {
    launch: feedLaunch ?? remoteLaunch,
    loading: Boolean(id) && (feedLoading || loading),
    error,
    notFound,
  };
}

export function useLaunchIntel(
  launch: Launch | null,
  enabled: boolean = true
) {
  const launchId = launch?.id ?? null;
  const launchIsLive = Boolean(launch?.isLive);
  const [intel, setIntel] = useState<LaunchIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!launchId || !enabled) {
      setIntel(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    async function fetchIntel(): Promise<void> {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/launch-intel?id=${encodeURIComponent(launchId!)}`,
          {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            checkedMessage(
              payload,
              `Mission intelligence unavailable (${response.status})`
            )
          );
        }

        const record =
          payload && typeof payload === 'object'
            ? (payload as Record<string, unknown>)
            : null;
        const result =
          record?.data && typeof record.data === 'object'
            ? (record.data as LaunchIntel)
            : (payload as LaunchIntel);

        setIntel(result);
        setError(null);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load mission intelligence'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchIntel();
    const interval = window.setInterval(
      () => void fetchIntel(),
      launchIsLive ? 2 * 60 * 1000 : 15 * 60 * 1000,
    );
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [enabled, launchId, launchIsLive]);

  return { intel, loading, error };
}

export function useRocketFacts() {
  const facts: RocketFact[] = [];
  return {
    currentFact: null as RocketFact | null,
    facts,
    loading: false,
    error: null as string | null,
  };
}

export function useCountdown(targetDate: string) {
  const now = useCurrentTime();
  const difference = new Date(targetDate).getTime() - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function useCompactCountdown(targetDate: string): string {
  const { days, hours, minutes, seconds, total } = useCountdown(targetDate);

  if (total <= 0) return 'Complete';
  if (days > 0) return `T−${days}d ${hours}h`;

  return `T−${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}`;
}
