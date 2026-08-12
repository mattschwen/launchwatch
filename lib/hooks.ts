'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Launch, LaunchIntel, RocketFact } from './types';
import { useLaunchData } from './contexts';
import { isLaunch, isLaunchIntel } from './launch-contract';
import { useOnlineStatus } from './online-status';

const clockListeners = new Set<() => void>();
let clockInterval: ReturnType<typeof setInterval> | null = null;
let clockSnapshot = { now: Date.now(), revision: 0 };

function updateClock(): void {
  clockSnapshot = {
    now: Date.now(),
    revision: clockSnapshot.revision + 1,
  };
  clockListeners.forEach((notify) => notify());
}

function stopClock(): void {
  if (!clockInterval) return;
  clearInterval(clockInterval);
  clockInterval = null;
}

function startClock(): void {
  if (
    clockInterval ||
    (typeof document !== 'undefined' && document.visibilityState !== 'visible')
  ) {
    return;
  }

  clockInterval = setInterval(updateClock, 1_000);
}

function handleClockVisibilityChange(): void {
  if (document.visibilityState !== 'visible') {
    stopClock();
    return;
  }

  updateClock();
  startClock();
}

function subscribeToClock(listener: () => void): () => void {
  const firstListener = clockListeners.size === 0;
  clockListeners.add(listener);

  // A fresh snapshot forces volatile clock text to reconcile immediately
  // after hydration, even when the current millisecond has not changed.
  updateClock();
  if (firstListener && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleClockVisibilityChange);
  }
  startClock();

  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      stopClock();
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleClockVisibilityChange,
        );
      }
    }
  };
}

function getClockSnapshot(): typeof clockSnapshot {
  return clockSnapshot;
}

function getServerClockSnapshot(): typeof clockSnapshot {
  return clockSnapshot;
}

export function useCurrentTime(): number {
  return useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  ).now;
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

function retryAtFromResponse(response: Response): number | null {
  if (response.status !== 429) return null;

  const retryAfter = response.headers.get('Retry-After')?.trim();
  if (!retryAfter) return null;

  const delaySeconds = Number(retryAfter);
  if (Number.isFinite(delaySeconds) && delaySeconds >= 0) {
    return Date.now() + Math.ceil(delaySeconds * 1_000);
  }

  const retryDate = Date.parse(retryAfter);
  return Number.isFinite(retryDate) && retryDate > Date.now()
    ? retryDate
    : null;
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

export function reconcileCurrentLaunch(
  feedLaunch: Launch | null,
  detailLaunch: Launch | null,
): Launch | null {
  if (!detailLaunch) return feedLaunch;
  if (!feedLaunch) return detailLaunch;

  return {
    ...detailLaunch,
    date: feedLaunch.date,
    dateUnix: feedLaunch.dateUnix,
    datePrecision: feedLaunch.datePrecision,
    windowStart: feedLaunch.windowStart,
    windowEnd: feedLaunch.windowEnd,
    launchProbability: feedLaunch.launchProbability,
    weatherConcerns: feedLaunch.weatherConcerns,
    holdReason: feedLaunch.holdReason,
    failureReason:
      feedLaunch.status === 'failure'
        ? feedLaunch.failureReason ?? detailLaunch.failureReason ?? null
        : null,
    providerUpdatedAt: feedLaunch.providerUpdatedAt,
    orbitalLaunchAttemptCountYear:
      feedLaunch.orbitalLaunchAttemptCountYear,
    providerLaunchAttemptCountYear:
      feedLaunch.providerLaunchAttemptCountYear,
    padLaunchAttemptCountYear: feedLaunch.padLaunchAttemptCountYear,
    status: feedLaunch.status,
    statusName: feedLaunch.statusName,
    statusDescription: feedLaunch.statusDescription,
    isLive: feedLaunch.isLive,
    webcastLive: feedLaunch.webcastLive,
  };
}

export function useLaunchById(id: string | null | undefined) {
  const { launches, online, loading: feedLoading } = useLaunchData();
  const [retryVersion, setRetryVersion] = useState(0);
  const feedLaunch = useMemo(
    () => (id ? launches.find((launch) => launch.id === id) ?? null : null),
    [id, launches]
  );
  const [remote, setRemote] = useState<{
    id: string;
    launch: Launch | null;
    loading: boolean;
    error: string | null;
    notFound: boolean;
    retrying: boolean;
  } | null>(null);
  const currentRemote = remote?.id === id ? remote : null;
  const launch = useMemo(
    () => reconcileCurrentLaunch(feedLaunch, currentRemote?.launch ?? null),
    [currentRemote?.launch, feedLaunch]
  );

  useEffect(() => {
    if (!id) {
      setRemote(null);
      return;
    }

    if (!online) {
      setRemote((current) =>
        current?.id === id
          ? { ...current, loading: false, retrying: false }
          : {
              id,
              launch: null,
              loading: false,
              error: null,
              notFound: false,
              retrying: false,
            },
      );
      return;
    }

    const controller = new AbortController();
    setRemote((current) => ({
      id,
      launch: current?.id === id ? current.launch : null,
      loading: true,
      error: null,
      notFound: false,
      retrying: Boolean(current?.id === id && current.retrying),
    }));

    async function fetchLaunch(): Promise<void> {
      try {
        const response = await fetch(`/api/launches/${encodeURIComponent(id!)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const payload: unknown = await response.json().catch(() => null);

        if (response.status === 404) {
          if (controller.signal.aborted) return;
          setRemote({
            id: id!,
            launch: null,
            loading: false,
            error: null,
            notFound: true,
            retrying: false,
          });
          return;
        }
        if (!response.ok) {
          throw new Error(
            checkedMessage(payload, `Mission unavailable (${response.status})`)
          );
        }

        const launch = extractLaunch(payload);
        if (!isLaunch(launch)) {
          throw new Error('Mission response was incomplete');
        }
        if (launch.id !== id) {
          throw new Error('Mission response did not match the requested ID');
        }
        if (controller.signal.aborted) return;
        setRemote({
          id: id!,
          launch,
          loading: false,
          error: null,
          notFound: false,
          retrying: false,
        });
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setRemote({
          id: id!,
          launch: null,
          loading: false,
          error:
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load this mission',
          notFound: false,
          retrying: false,
        });
      }
    }

    void fetchLaunch();
    return () => controller.abort();
  }, [id, online, retryVersion]);

  const retry = (): void => {
    if (!online || !id || currentRemote?.loading || !currentRemote?.error) return;

    setRemote((current) => ({
      id,
      launch: current?.id === id ? current.launch : null,
      loading: true,
      error: current?.id === id ? current.error : null,
      notFound: false,
      retrying: true,
    }));
    setRetryVersion((current) => current + 1);
  };

  return {
    launch,
    enriching:
      Boolean(id) &&
      Boolean(feedLaunch) &&
      (!currentRemote || currentRemote.loading),
    loading:
      Boolean(id) &&
      !launch &&
      (feedLoading || !currentRemote || currentRemote.loading),
    error: currentRemote?.error ?? null,
    notFound: currentRemote?.notFound ?? false,
    retrying: currentRemote?.retrying ?? false,
    retry,
  };
}

export function useLaunchIntel(
  launch: Launch | null,
  enabled: boolean = true
) {
  const online = useOnlineStatus();
  const launchId = launch?.id ?? null;
  const launchIsLive = Boolean(launch?.isLive);
  const [retryVersion, setRetryVersion] = useState(0);
  const [intelState, setIntelState] = useState<{
    launchId: string | null;
    intel: LaunchIntel | null;
    loading: boolean;
    error: string | null;
    retryAt: number | null;
  }>({
    launchId: null,
    intel: null,
    loading: false,
    error: null,
    retryAt: null,
  });

  useEffect(() => {
    if (!launchId || !enabled || !online) {
      return;
    }

    const controller = new AbortController();
    let retryNotBefore = 0;

    async function fetchIntel(): Promise<void> {
      if (retryNotBefore > Date.now()) return;

      try {
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
          if (controller.signal.aborted) return;
          const retryAt = retryAtFromResponse(response);
          retryNotBefore = retryAt ?? 0;
          setIntelState((current) => ({
            launchId,
            intel: current.launchId === launchId ? current.intel : null,
            loading: false,
            error: checkedMessage(
              payload,
              `Mission intelligence unavailable (${response.status})`
            ),
            retryAt,
          }));
          return;
        }

        const record =
          payload && typeof payload === 'object'
            ? (payload as Record<string, unknown>)
            : null;
        const result: unknown =
          record?.data && typeof record.data === 'object'
            ? record.data
            : payload;

        if (!isLaunchIntel(result)) {
          throw new Error('Mission intelligence response was incomplete');
        }

        retryNotBefore = 0;
        setIntelState({
          launchId,
          intel: result,
          loading: false,
          error: null,
          retryAt: null,
        });
      } catch (requestError) {
        if (controller.signal.aborted) return;
        retryNotBefore = 0;
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load mission intelligence';
        setIntelState((current) => ({
          launchId,
          intel: current.launchId === launchId ? current.intel : null,
          loading: false,
          error: message,
          retryAt: null,
        }));
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
  }, [enabled, launchId, launchIsLive, online, retryVersion]);

  const currentState =
    enabled && intelState.launchId === launchId ? intelState : null;
  const retry = (): void => {
    if (
      !currentState?.error ||
      !online ||
      currentState.loading ||
      (currentState.retryAt !== null && currentState.retryAt > Date.now())
    ) {
      return;
    }
    setIntelState((current) => ({
      launchId,
      intel: current.launchId === launchId ? current.intel : null,
      loading: true,
      error: current.launchId === launchId ? current.error : null,
      retryAt: current.launchId === launchId ? current.retryAt : null,
    }));
    setRetryVersion((current) => current + 1);
  };

  return {
    intel: currentState?.intel ?? null,
    loading: Boolean(launchId && enabled && online) && (
      !currentState || currentState.loading
    ),
    offline: Boolean(launchId && enabled && !online),
    error: currentState?.error ?? null,
    retryAt: currentState?.retryAt ?? null,
    retry,
  };
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
      now,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
    now,
  };
}
