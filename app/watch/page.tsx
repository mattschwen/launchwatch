'use client';

import {
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Radio,
  Rocket,
} from 'lucide-react';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import LaunchActions from '@/components/launch/LaunchActions';
import MissionVisual from '@/components/launch/MissionVisual';
import StatusBadge from '@/components/ui/StatusBadge';
import VideoPlayer from '@/components/video/VideoPlayer';
import {
  formatLaunchDate,
  isCriticalLaunchStatusName,
  shortenLaunchSite,
} from '@/lib/format';
import {
  useLaunchById,
  useLaunchIntel,
  useLaunches,
  useLiveLaunches,
} from '@/lib/hooks';
import { getFallbackLaunchSummary } from '@/lib/launch-action';
import type { Launch } from '@/lib/types';

const MissionTrajectory = dynamic(
  () => import('@/components/MissionTrajectory'),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Loading mission trajectory"
        aria-busy="true"
        className="skeleton min-h-[55rem] rounded-[var(--radius-md)] sm:min-h-[52rem]"
      />
    ),
  },
);

function DeferredWatchTrajectory({
  launch,
}: {
  launch: Launch;
}): React.ReactElement {
  const [enabled, setEnabled] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const keyboardEncounteredRef = useRef(false);
  const manualLoadRef = useRef(false);

  useEffect(() => {
    if (enabled) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timeout = window.setTimeout(() => setEnabled(true), 0);
      return () => window.clearTimeout(timeout);
    }

    const host = hostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !keyboardEncounteredRef.current) {
          setEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !manualLoadRef.current) return;

    const focusFirstMapControl = (): boolean => {
      const control =
        hostRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      if (!control) return false;
      control.focus();
      return true;
    };

    if (focusFirstMapControl()) return;

    const observer = new MutationObserver(() => {
      if (focusFirstMapControl()) observer.disconnect();
    });
    if (hostRef.current) {
      observer.observe(hostRef.current, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [enabled]);

  const loadTrajectory = (): void => {
    manualLoadRef.current = true;
    setEnabled(true);
  };

  return (
    <div ref={hostRef} className="mt-5">
      {enabled ? (
        <MissionTrajectory launch={launch} variant="detail" />
      ) : (
        <section
          aria-labelledby="watch-trajectory-pending-title"
          data-trajectory-pending="true"
          className="surface-card holo-card signal-cold flex min-h-[55rem] flex-col overflow-hidden p-5 sm:min-h-[52rem] sm:p-6"
        >
          <div className="max-w-xl">
            <p className="data-label text-[var(--console-cyan)]">
              Secondary telemetry
            </p>
            <h2
              id="watch-trajectory-pending-title"
              className="section-title mt-2"
            >
              Mission trajectory
            </h2>
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
              {launch.name}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              The illustrative path loads as it approaches the viewport. Load
              it now to inspect the reported site and modeled mission phases.
            </p>
            <button
              type="button"
              onFocus={() => {
                keyboardEncounteredRef.current = true;
              }}
              onClick={loadTrajectory}
              className="action-button action-button-secondary mt-5"
            >
              Load mission trajectory
            </button>
          </div>
          <div aria-hidden="true" className="mt-8 w-full">
            <div className="skeleton h-[20rem] rounded-[var(--radius-sm)] sm:h-[22rem]" />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="skeleton h-[4.5rem] rounded-[var(--radius-sm)]"
                />
              ))}
            </div>
            <div className="skeleton mt-3 h-[5.5rem] rounded-[var(--radius-sm)]" />
          </div>
        </section>
      )}
    </div>
  );
}

function WatchStage({
  launch,
  detailHref,
  streamLookupError,
}: {
  launch: Launch;
  detailHref: string;
  streamLookupError?: string | null;
}): React.ReactElement {
  const fallback = getFallbackLaunchSummary(launch);
  const hasProviderChannel = fallback.streamState === 'standby';
  const fallbackDescription = streamLookupError
    ? hasProviderChannel
      ? 'The mission schedule is available, but detailed provider coverage could not be checked. Use the official provider channel while we retry.'
      : 'The mission schedule is available, but detailed provider coverage could not be checked. Search for current mission coverage while we retry.'
    : hasProviderChannel
      ? 'We are between launches. Follow the next mission or use the official provider channel while coverage is being scheduled.'
      : 'No verified stream is scheduled yet. Search for current mission coverage while provider details are being updated.';

  if (launch.livestream) {
    return (
      <div className="video-signal-frame holo-card signal-live relative overflow-hidden rounded-[var(--radius-md)] border bg-black">
        <VideoPlayer
          url={launch.livestream}
          title={launch.name}
          autoplay={launch.isLive}
          className="rounded-none"
        />
      </div>
    );
  }

  return (
    <section className="stream-surface holo-card signal-warm relative flex min-h-[22rem] w-full min-w-0 flex-col items-center justify-center rounded-[var(--radius-md)] border px-5 text-center sm:aspect-video">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(88,230,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,79,216,0.025)_1px,transparent_1px)] bg-[size:34px_34px]"
      />
      <Rocket
        aria-hidden="true"
        size={88}
        strokeWidth={0.8}
        className="absolute bottom-[-0.6rem] right-[7%] text-[var(--border-strong)]"
      />
      <div className="relative max-w-xl">
        {streamLookupError ? (
          <AlertTriangle
            aria-hidden="true"
            className="mx-auto text-[var(--console-amber)]"
            size={34}
          />
        ) : (
          <Radio
            aria-hidden="true"
            className="mx-auto text-[var(--console-magenta)]"
            size={34}
          />
        )}
        <h2 className="mt-5 text-[clamp(1.65rem,4vw,2.5rem)] font-bold tracking-[-0.035em] text-[var(--text-primary)]">
          {streamLookupError
            ? 'Stream status unavailable'
            : 'No live stream right now'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {fallbackDescription}
        </p>
        <div className="my-6 h-px bg-[var(--border-subtle)]" />
        <p className="data-label">Next mission</p>
        <Link
          href={detailHref}
          className="mt-1 inline-flex min-h-11 max-w-full items-center justify-center text-xl font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--console-cyan)]"
        >
          {launch.name}
        </Link>
        <div className="mt-3">
          <Countdown targetDate={launch.date} compact />
        </div>
        {fallback.recommendedUrl ? (
          <a
            href={fallback.recommendedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button action-button-secondary mt-6"
          >
            <ExternalLink aria-hidden="true" size={16} />
            {hasProviderChannel ? 'Open provider channel' : 'Search for stream'}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function WatchMissionVisual({
  launch,
  loading,
  error,
  collapsible,
  className = '',
}: {
  launch: Launch;
  loading: boolean;
  error: string | null;
  collapsible: boolean;
  className?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  if (!collapsible) {
    return (
      <MissionVisual
        launch={launch}
        compact
        loading={loading}
        error={error}
        showUnavailableState
        className={`max-w-xl ${className}`}
      />
    );
  }

  return (
    <section
      className={`surface-card holo-card signal-cold max-w-xl overflow-hidden ${className}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        aria-label={`${open ? 'Hide' : 'Show'} rocket reference for ${
          launch.name
        }`}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-subtle)]"
      >
        <span className="min-w-0">
          <span className="data-label block text-[var(--console-cyan)]">
            Vehicle archive
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-[var(--text-primary)]">
            Rocket reference image
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--console-cyan)]">
          {open ? 'Hide' : 'Show'}
          <ChevronDown
            aria-hidden="true"
            size={16}
            className={`transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>
      {open ? (
        <div id={regionId}>
          <MissionVisual
            launch={launch}
            compact
            loading={loading}
            error={error}
            showUnavailableState
            className="max-w-none rounded-none border-x-0 border-b-0"
          />
        </div>
      ) : null}
    </section>
  );
}

function MissionQueue({
  launches,
  selectedId,
  onSelect,
}: {
  launches: Launch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): React.ReactElement {
  const queuedLaunches = launches.slice(0, 10);
  const queueLabel = `${queuedLaunches.length} mission${
    queuedLaunches.length === 1 ? '' : 's'
  }${queuedLaunches.length > 4 ? ' · scroll' : ''}`;

  return (
    <aside
      aria-labelledby="next-up-title"
      className="surface-card holo-card signal-cold overflow-hidden"
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
        <h2 id="next-up-title" className="section-title text-[1.2rem]">
          Next up
        </h2>
        <p className="data-label shrink-0 text-[var(--text-muted)]">
          {queueLabel}
        </p>
      </div>
      <div
        data-watch-queue-scroll
        className="max-h-[20.8rem] overflow-y-auto overscroll-contain lg:max-h-[42rem]"
      >
        {queuedLaunches.map((launch) => {
          const selected = launch.id === selectedId;
          return (
            <button
              key={launch.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(launch.id)}
              className={`flex min-h-[5.2rem] w-full items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition-colors last:border-0 ${
                selected
                  ? launch.isLive
                    ? 'bg-[var(--surface-live)] shadow-[inset_3px_0_0_var(--console-magenta)]'
                    : 'bg-[var(--surface-accent)] shadow-[inset_3px_0_0_var(--console-cyan)]'
                  : 'hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  launch.isLive
                    ? 'status-dot-live bg-[var(--console-magenta)]'
                    : launch.status === 'failure' ||
                        isCriticalLaunchStatusName(launch.statusName)
                      ? 'bg-[var(--console-red)]'
                      : launch.status === 'tbd'
                      ? 'bg-[var(--console-amber)]'
                      : 'bg-[var(--console-green)]'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                  {launch.name}
                </span>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {formatLaunchDate(launch.date)}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--console-cyan)]">
                  {launch.provider || launch.rocket}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                size={16}
                className="shrink-0 text-[var(--text-muted)]"
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function WatchContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const {
    launches,
    loading: feedLoading,
    refreshing,
    error,
    meta,
    refresh,
  } = useLaunches();
  const { liveLaunches } = useLiveLaunches();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const missionLinkRef = useRef<HTMLAnchorElement>(null);
  const retryFocusPendingRef = useRef(false);

  const queue = useMemo(() => {
    const byId = new Map<string, Launch>();
    [...liveLaunches, ...launches].forEach((launch) => byId.set(launch.id, launch));
    return [...byId.values()].sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return a.dateUnix - b.dateUnix;
    });
  }, [launches, liveLaunches]);

  const fallbackLaunch = liveLaunches[0] ?? queue[0] ?? null;
  const selectedId = requestedId ?? fallbackLaunch?.id ?? null;
  const selected = useLaunchById(selectedId);
  const requestedUnavailable = Boolean(
    requestedId &&
      !selected.loading &&
      !selected.launch &&
      (selected.notFound || selected.error),
  );
  const selectedLaunch =
    selected.launch ?? (requestedUnavailable ? fallbackLaunch : null);
  const selectedDetailHref = selectedLaunch
    ? `/launch/${encodeURIComponent(selectedLaunch.id)}?from=watch`
    : '';
  const { intel, loading: intelLoading, error: intelError } = useLaunchIntel(
    selectedLaunch,
    Boolean(selectedLaunch)
  );

  useEffect(() => {
    if (!selectedLaunch || !retryFocusPendingRef.current) return;

    retryFocusPendingRef.current = false;
    const frame = window.requestAnimationFrame(() =>
      missionLinkRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [selectedLaunch]);

  const selectLaunch = (id: string): void => {
    router.replace(`/watch?id=${encodeURIComponent(id)}`, { scroll: false });
  };

  const retrySchedule = (): void => {
    if (refreshing) return;
    retryFocusPendingRef.current = true;
    void refresh();
  };

  const loading =
    (feedLoading && queue.length === 0) ||
    (Boolean(requestedId) && selected.loading && !selected.launch);

  if (loading) {
    return (
      <div className="page-container py-5 sm:py-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="skeleton min-h-[22rem] w-full min-w-0 rounded-[var(--radius-md)] sm:aspect-video" />
          <div className="skeleton min-h-[30rem] rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  if (!selectedLaunch) {
    return (
      <div className="page-container py-16 text-center">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto text-[var(--console-amber)]"
          size={38}
        />
        <h1 className="mt-5 text-3xl font-bold text-[var(--text-primary)]">
          The watch schedule is unavailable.
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {selected.error || error || 'No missions were returned.'}
        </p>
        <button
          type="button"
          onClick={retrySchedule}
          aria-disabled={refreshing}
          aria-busy={refreshing}
          className="action-button action-button-secondary mt-6 scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {refreshing ? 'Retrying watch schedule' : 'Retry watch schedule'}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-container py-4 sm:py-6 lg:py-8">
        {requestedUnavailable ? (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-amber)_42%,transparent)] bg-[color-mix(in_srgb,var(--console-amber)_8%,var(--surface-base))] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-[var(--text-secondary)]">
              The requested mission could not be opened. Showing{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {selectedLaunch.name}
              </span>{' '}
              from the current queue instead.
            </p>
            <button
              type="button"
              onClick={() => window.location.replace('/watch')}
              className="action-button action-button-quiet shrink-0 font-mono text-xs uppercase tracking-[0.12em]"
            >
              Clear deep link
            </button>
          </div>
        ) : null}

        <div className="route-masthead signal-live mb-6 flex flex-wrap items-center justify-between gap-3 pb-2">
          <div>
            <p className="data-label text-[var(--console-magenta)]">
              Launch network / active console
            </p>
            <h1 className="section-title mt-1 text-[clamp(1.55rem,4vw,2.4rem)]">
              Watch room
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {liveLaunches.length > 0
                ? `${liveLaunches.length} mission${liveLaunches.length === 1 ? '' : 's'} live`
                : 'Provider streams and launch windows'}
              {meta?.partial ? ' · partial provider data' : ''}
            </p>
          </div>
          <StatusBadge
            status={selectedLaunch.status}
            statusName={selectedLaunch.statusName}
          />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0">
            <WatchStage
              launch={selectedLaunch}
              detailHref={selectedDetailHref}
              streamLookupError={selected.launch ? selected.error : null}
            />

            <section
              className={`surface-card holo-card mt-4 p-5 sm:p-6 ${
                selectedLaunch.isLive || selectedLaunch.livestream
                  ? 'signal-live'
                  : 'signal-cold'
              }`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    ref={missionLinkRef}
                    href={selectedDetailHref}
                    className="group inline-flex min-h-11 max-w-full items-center"
                  >
                    <h2 className="text-[clamp(1.65rem,3vw,2.5rem)] font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
                      {selectedLaunch.name}
                    </h2>
                  </Link>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {selectedLaunch.rocket} ·{' '}
                    {shortenLaunchSite(selectedLaunch.launchSite)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--console-cyan)]">
                    {formatLaunchDate(selectedLaunch.date)}
                  </p>
                </div>
                <LaunchActions
                  launch={selectedLaunch}
                  detailHref={selectedDetailHref}
                  onOpenBriefing={() => setBriefingOpen(true)}
                  compact
                  className="shrink-0"
                />
              </div>
              {selectedLaunch.description ? (
                <p className="mt-5 max-w-4xl border-t border-[var(--border-subtle)] pt-5 text-sm leading-6 text-[var(--text-secondary)]">
                  {selectedLaunch.description}
                </p>
              ) : null}
            </section>
          </div>

          <MissionQueue
            launches={queue}
            selectedId={selectedLaunch.id}
            onSelect={selectLaunch}
          />

          <WatchMissionVisual
            key={selectedLaunch.id}
            launch={selectedLaunch}
            loading={selected.enriching}
            error={selected.error}
            collapsible={Boolean(selectedLaunch.livestream)}
            className="lg:col-start-1"
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <LaunchIntelDeck
            launch={selectedLaunch}
            intel={intel}
            loading={intelLoading}
            error={intelError}
          />
          <aside className="surface-card holo-card signal-warm p-5">
            <h2 className="section-title text-[1.15rem]">Source & status</h2>
            <div
              className={`mt-4 flex items-center gap-2 text-sm ${
                meta?.partial
                  ? 'text-[var(--console-amber)]'
                  : 'text-[var(--console-green)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  meta?.partial
                    ? 'bg-[var(--console-amber)]'
                    : 'bg-[var(--console-green)]'
                }`}
              />
              {meta?.partial ? 'Schedule partially available' : 'Schedule online'}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Schedules and stream links are aggregated from official providers.
              Launch times can change.
            </p>
            <Link
              href="/history"
              className="action-button action-button-quiet -ml-4 mt-4 scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
            >
              Browse launch archive
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </aside>
        </div>

        <DeferredWatchTrajectory
          key={selectedLaunch.id}
          launch={selectedLaunch}
        />
      </div>

      <LaunchBriefingDrawer
        launch={selectedLaunch}
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        detailHref={selectedDetailHref}
      />
    </>
  );
}

function WatchFallback(): React.ReactElement {
  return (
    <div className="page-container py-5">
      <div className="skeleton aspect-video rounded-[var(--radius-md)]" />
    </div>
  );
}

export default function WatchPage(): React.ReactElement {
  return (
    <Suspense fallback={<WatchFallback />}>
      <WatchContent />
    </Suspense>
  );
}
