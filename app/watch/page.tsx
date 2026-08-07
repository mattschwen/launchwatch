'use client';

import {
  Fragment,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  LoaderCircle,
  Radio,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LocalLaunchTime from '@/components/LocalLaunchTime';
import MissionDescription from '@/components/MissionDescription';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import LaunchActions from '@/components/launch/LaunchActions';
import LaunchWindow from '@/components/launch/LaunchWindow';
import MissionVisual from '@/components/launch/MissionVisual';
import MissionVisualDisclosure from '@/components/launch/MissionVisualDisclosure';
import { RESET_WATCH_SELECTION_EVENT } from '@/components/layout/navigation';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import StatusBadge from '@/components/ui/StatusBadge';
import VideoPlayer from '@/components/video/VideoPlayer';
import {
  formatLaunchDate,
  formatPrimaryMissionName,
  getLaunchSiteDisplay,
  getLaunchLiveSignal,
  isCriticalLaunchStatusName,
} from '@/lib/format';
import {
  useLaunchById,
  useLaunchIntel,
  useLaunches,
  useLiveLaunches,
} from '@/lib/hooks';
import { getFallbackLaunchSummary } from '@/lib/launch-action';
import { selectLaunchVisual } from '@/lib/launch-visual';
import type { Launch } from '@/lib/types';

const MissionTrajectory = dynamic(
  () => import('@/components/MissionTrajectory'),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-busy="true"
        className="skeleton min-h-[21rem] rounded-[var(--radius-md)] sm:min-h-[52rem]"
      >
        <span className="sr-only">Loading mission trajectory</span>
      </div>
    ),
  },
);

const MAX_VISIBLE_QUEUE_MISSIONS = 10;

function getVisibleQueue(
  launches: Launch[],
  selectedId: string | null,
): Launch[] {
  const firstMissions = launches.slice(0, MAX_VISIBLE_QUEUE_MISSIONS);
  if (
    !selectedId ||
    firstMissions.some((launch) => launch.id === selectedId)
  ) {
    return firstMissions;
  }

  const selectedLaunch = launches.find((launch) => launch.id === selectedId);
  if (!selectedLaunch) return firstMissions;

  return [
    ...firstMissions.slice(0, MAX_VISIBLE_QUEUE_MISSIONS - 1),
    selectedLaunch,
  ];
}

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

    let activationFrame = 0;
    let confirmationFrame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || keyboardEncounteredRef.current) return;

        window.cancelAnimationFrame(activationFrame);
        window.cancelAnimationFrame(confirmationFrame);
        activationFrame = window.requestAnimationFrame(() => {
          confirmationFrame = window.requestAnimationFrame(() => {
            const bounds = host.getBoundingClientRect();
            const withinPreloadRange =
              bounds.bottom >= -600 && bounds.top <= window.innerHeight + 600;
            if (!withinPreloadRange || keyboardEncounteredRef.current) return;

            setEnabled(true);
            observer.disconnect();
          });
        });
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(activationFrame);
      window.cancelAnimationFrame(confirmationFrame);
    };
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
          className="surface-card holo-card signal-cold flex min-h-[21rem] flex-col overflow-hidden p-5 sm:min-h-[52rem] sm:p-6"
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
          <div
            aria-hidden="true"
            data-trajectory-placeholder="true"
            className="mt-8 hidden w-full sm:block"
          >
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

function WatchLoadingState({
  requestedMission = false,
}: {
  requestedMission?: boolean;
}): React.ReactElement {
  return (
    <div
      className="page-container py-4 sm:py-6 lg:py-8"
      aria-label="Synchronizing watch room"
      aria-busy="true"
    >
      <div className="route-masthead signal-cold mb-6 pb-2">
        <p className="data-label text-[var(--console-cyan)]">
          Launch network / provider handshake
        </p>
        <h1 className="section-title mt-1 text-[clamp(1.55rem,4vw,2.4rem)]">
          Watch room
        </h1>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-1 text-sm text-[var(--text-muted)]"
        >
          {requestedMission
            ? 'Resolving the requested mission and checking provider coverage.'
            : 'Synchronizing mission queue and coverage channels.'}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section
          aria-labelledby="watch-coverage-loading-title"
          aria-busy="true"
          className="surface-card holo-card signal-cold min-h-[22rem] overflow-hidden p-5 sm:aspect-video sm:p-6"
        >
          <div className="flex items-start gap-3">
            <Radio
              aria-hidden="true"
              size={20}
              className="mt-0.5 shrink-0 text-[var(--console-cyan)]"
            />
            <div>
              <p className="data-label text-[var(--console-cyan)]">
                Coverage console
              </p>
              <h2
                id="watch-coverage-loading-title"
                className="section-title mt-2"
              >
                {requestedMission
                  ? 'Resolving requested mission'
                  : 'Acquiring mission coverage'}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                Verifying launch timing, official streams, and provider handoff
                details.
              </p>
            </div>
          </div>
          <div aria-hidden="true" className="mt-8">
            <div className="skeleton aspect-video max-h-[17rem] rounded-[var(--radius-sm)]" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="skeleton h-11 rounded-[var(--radius-sm)]" />
              <div className="skeleton h-11 rounded-[var(--radius-sm)]" />
            </div>
          </div>
        </section>

        <aside
          aria-labelledby="watch-queue-loading-title"
          aria-busy="true"
          className="surface-card holo-card signal-cold min-h-[30rem] overflow-hidden"
        >
          <header className="border-b border-[var(--border-subtle)] px-5 py-5">
            <p className="data-label text-[var(--console-cyan)]">
              Upcoming network
            </p>
            <h2 id="watch-queue-loading-title" className="section-title mt-2">
              Mission queue
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Awaiting synchronized launch windows
            </p>
          </header>
          <div aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="border-b border-[var(--border-subtle)] p-4 last:border-0"
              >
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton mt-3 h-3 w-full rounded" />
                <div className="skeleton mt-2 h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function WatchStage({
  launch,
  detailHref,
  detailLoading,
  detailRetrying,
  coverageUnconfirmed,
  coverageRegionRef,
  onRetryDetails,
  streamLookupError,
}: {
  launch: Launch;
  detailHref: string;
  detailLoading: boolean;
  detailRetrying: boolean;
  coverageUnconfirmed: boolean;
  coverageRegionRef: React.RefObject<HTMLDivElement | null>;
  onRetryDetails: () => void;
  streamLookupError?: string | null;
}): React.ReactElement {
  const fallback = getFallbackLaunchSummary(launch);
  const primaryMissionName = formatPrimaryMissionName(launch);
  const hasProviderChannel = fallback.streamState === 'standby';
  const liveCoverage = launch.isLive && !coverageUnconfirmed;
  const fallbackDescription = detailLoading
    ? 'Checking canonical mission details for an official stream. The schedule and safe provider fallback remain available.'
    : streamLookupError
    ? hasProviderChannel
      ? 'The mission schedule is available, but detailed provider coverage could not be checked. Use the official provider channel or retry mission details.'
      : 'The mission schedule is available, but detailed provider coverage could not be checked. Search for current coverage or retry mission details.'
    : hasProviderChannel
      ? 'We are between launches. Follow the next mission or use the official provider channel while coverage is being scheduled.'
      : 'No verified stream is scheduled yet. Search for current mission coverage while provider details are being updated.';
  const coverageLabel = launch.livestream
    ? liveCoverage
      ? 'Mission coverage live'
      : coverageUnconfirmed && launch.isLive
        ? 'Mission coverage status unconfirmed'
      : 'Mission coverage scheduled'
    : detailLoading
      ? 'Mission coverage check in progress'
      : streamLookupError
        ? 'Mission coverage unavailable'
        : 'Mission coverage standby';

  if (launch.livestream) {
    return (
      <div
        ref={coverageRegionRef}
        role="region"
        aria-label={coverageLabel}
        tabIndex={-1}
        className={`rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--console-cyan)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-canvas)] ${
          liveCoverage
            ? 'signal-live'
            : coverageUnconfirmed && launch.isLive
              ? 'signal-warm'
              : 'signal-cold'
        }`}
      >
        <div
          className={`holo-card relative overflow-hidden rounded-[var(--radius-md)] border bg-black ${
            liveCoverage
              ? 'video-signal-frame'
              : 'border-[var(--border-strong)]'
          }`}
        >
          <VideoPlayer
            url={launch.livestream}
            title={launch.name}
            autoplay={liveCoverage}
            live={liveCoverage}
            className="rounded-none"
          />
        </div>
      </div>
    );
  }

  return (
    <section
      ref={coverageRegionRef}
      role="region"
      aria-label={coverageLabel}
      tabIndex={-1}
      className="stream-surface holo-card signal-warm relative flex min-h-0 w-full min-w-0 flex-col items-center justify-center rounded-[var(--radius-md)] border px-4 py-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--console-cyan)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-canvas)] min-[360px]:min-h-[22rem] min-[360px]:px-5 min-[360px]:py-0 sm:aspect-video"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(88,230,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,196,92,0.025)_1px,transparent_1px)] bg-[size:34px_34px]"
      />
      <Rocket
        aria-hidden="true"
        size={88}
        strokeWidth={0.8}
        className="absolute bottom-[-0.6rem] right-[7%] hidden text-[var(--border-strong)] min-[360px]:block"
      />
      <div className="relative max-w-xl">
        {detailLoading ? (
          <LoaderCircle
            aria-hidden="true"
            className="mx-auto hidden animate-spin text-[var(--console-cyan)] min-[360px]:block"
            size={34}
          />
        ) : streamLookupError ? (
          <AlertTriangle
            aria-hidden="true"
            className="mx-auto hidden text-[var(--console-amber)] min-[360px]:block"
            size={34}
          />
        ) : (
          <Radio
            aria-hidden="true"
            className="mx-auto hidden text-[var(--console-amber)] min-[360px]:block"
            size={34}
          />
        )}
        <h2 className="text-xl font-bold leading-tight tracking-[-0.035em] text-[var(--text-primary)] min-[360px]:mt-5 min-[360px]:text-[clamp(1.65rem,4vw,2.5rem)]">
          {detailLoading
            ? 'Checking stream status'
            : streamLookupError
            ? 'Stream status unavailable'
            : 'No live stream right now'}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] min-[360px]:mt-2 min-[360px]:text-sm min-[360px]:leading-6">
          {fallbackDescription}
        </p>
        <div className="my-2 h-px bg-[var(--border-subtle)] min-[360px]:my-6" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 min-[360px]:contents">
          <p className="data-label hidden min-[360px]:block">Next mission</p>
          <Link
            href={detailHref}
            className="inline-flex min-h-11 min-w-0 max-w-full items-center justify-center text-base font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--console-cyan)] min-[360px]:mt-1 min-[360px]:text-xl"
          >
            {primaryMissionName}
          </Link>
          <div className="min-[360px]:mt-3">
            <Countdown
              targetDate={launch.date}
              precision={launch.datePrecision}
              windowStart={launch.windowStart}
              windowEnd={launch.windowEnd}
              compact
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2 min-[360px]:mt-6">
          {fallback.recommendedUrl ? (
            <a
              href={fallback.recommendedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`action-button ${
                streamLookupError
                  ? 'action-button-quiet'
                  : 'action-button-secondary'
              }`}
            >
              <ExternalLink aria-hidden="true" size={16} />
              {hasProviderChannel ? 'Open provider channel' : 'Search for stream'}
              <ExternalLinkHint />
            </a>
          ) : null}
          {streamLookupError || detailRetrying ? (
            <button
              type="button"
              onClick={onRetryDetails}
              aria-disabled={detailRetrying}
              aria-busy={detailRetrying}
              className="action-button action-button-secondary aria-disabled:cursor-wait aria-disabled:opacity-60"
            >
              <RefreshCw
                aria-hidden="true"
                size={16}
                className={detailRetrying ? 'animate-spin' : ''}
              />
              {detailRetrying ? 'Retrying mission details' : 'Retry mission details'}
            </button>
          ) : null}
        </div>
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
  const visual = selectLaunchVisual(launch);

  if (visual.status !== 'available') {
    return (
      <MissionVisualDisclosure
        launch={launch}
        loading={loading}
        error={error}
        className={`max-w-none ${className}`}
      />
    );
  }

  if (!collapsible) {
    return (
      <MissionVisual
        launch={launch}
        priority
        compact
        loading={loading}
        error={error}
        showUnavailableState
        className={className}
      />
    );
  }

  return (
    <section
      className={`surface-card holo-card signal-cold overflow-hidden ${className}`}
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
  coverageUnconfirmed,
  onSelect,
}: {
  launches: Launch[];
  selectedId: string | null;
  coverageUnconfirmed: boolean;
  onSelect: (
    id: string,
    revealMission?: boolean,
    historyMode?: 'push' | 'replace',
  ) => void;
}): React.ReactElement {
  const queuedLaunches = getVisibleQueue(launches, selectedId);
  const viewportRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = queuedLaunches.findIndex(
    (launch) => launch.id === selectedId
  );
  const selectedFeedIndex = launches.findIndex(
    (launch) => launch.id === selectedId
  );
  const selectedMissionAppended =
    selectedFeedIndex >= MAX_VISIBLE_QUEUE_MISSIONS &&
    queuedLaunches.at(-1)?.id === selectedId;
  const omittedBeforeSelected = selectedMissionAppended
    ? selectedFeedIndex - (MAX_VISIBLE_QUEUE_MISSIONS - 1)
    : 0;
  const omittedMissionLabel = `${omittedBeforeSelected} mission${
    omittedBeforeSelected === 1 ? '' : 's'
  } omitted`;
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const queueTruncated = launches.length > queuedLaunches.length;
  const queueLabel = selectedMissionAppended
    ? `${MAX_VISIBLE_QUEUE_MISSIONS - 1} scheduled + selected · ${launches.length} total`
    : `${queuedLaunches.length}${
        queueTruncated ? ` of ${launches.length}` : ''
      } mission${
        queuedLaunches.length === 1 ? '' : 's'
      }${queuedLaunches.length > 4 ? ' · scroll' : ''}`;

  useEffect(() => {
    const viewport = viewportRef.current;
    const selectedOption = optionRefs.current[selectedIndex];
    if (!viewport || !selectedOption) return;

    const viewportBounds = viewport.getBoundingClientRect();
    const optionBounds = selectedOption.getBoundingClientRect();

    if (optionBounds.top < viewportBounds.top) {
      viewport.scrollTop += optionBounds.top - viewportBounds.top;
    } else if (optionBounds.bottom > viewportBounds.bottom) {
      viewport.scrollTop += optionBounds.bottom - viewportBounds.bottom;
    }
  }, [selectedId, selectedIndex]);

  const handleQueueKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ): void => {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();
    const lastIndex = queuedLaunches.length - 1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowDown'
            ? (index + 1) % queuedLaunches.length
            : (index - 1 + queuedLaunches.length) % queuedLaunches.length;
    const nextLaunch = queuedLaunches[nextIndex];

    optionRefs.current[nextIndex]?.focus();
    onSelect(nextLaunch.id);
  };

  return (
    <aside
      aria-labelledby="mission-queue-title"
      className="surface-card holo-card signal-cold overflow-hidden"
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
        <h2 id="mission-queue-title" className="section-title text-[1.2rem]">
          Mission queue
        </h2>
        <p className="data-label shrink-0 text-[var(--text-muted)]">
          {queueLabel}
        </p>
      </div>
      <div
        ref={viewportRef}
        data-watch-queue-scroll
        role="group"
        aria-label="Mission selection"
        aria-describedby="watch-queue-instructions"
        className="max-h-[20.8rem] overflow-y-auto overscroll-contain lg:max-h-[42rem]"
      >
        <p id="watch-queue-instructions" className="sr-only">
          Use the Up and Down arrow keys to move between missions. Use Home or
          End to jump to the first or last visible mission.
          {selectedMissionAppended
            ? ` The first ${MAX_VISIBLE_QUEUE_MISSIONS - 1} missions are followed by the selected mission at position ${selectedFeedIndex + 1} of ${launches.length}.`
            : ''}
        </p>
        {queuedLaunches.map((launch, index) => {
          const selected = launch.id === selectedId;
          return (
            <Fragment key={launch.id}>
              {selectedMissionAppended && index === selectedIndex ? (
                <div
                  role="separator"
                  aria-label={`${omittedMissionLabel} before selected mission ${selectedFeedIndex + 1} of ${launches.length}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-y border-dashed border-[var(--console-cyan)]/25 bg-[var(--console-cyan)]/[0.035] px-4 py-2.5"
                >
                  <span className="data-label text-[var(--text-muted)]">
                    {omittedMissionLabel}
                  </span>
                  <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--console-cyan)]">
                    Selected {selectedFeedIndex + 1} of {launches.length}
                  </span>
                </div>
              ) : null}
              <button
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                aria-pressed={selected}
                tabIndex={index === tabStopIndex ? 0 : -1}
                onClick={(event: MouseEvent<HTMLButtonElement>) =>
                  onSelect(launch.id, event.detail > 0, 'push')
                }
                onKeyDown={(event) => handleQueueKeyDown(event, index)}
                className={`flex min-h-[5.2rem] w-full items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition-colors last:border-0 ${
                  selected
                    ? launch.isLive && !coverageUnconfirmed
                      ? 'bg-[var(--surface-live)] shadow-[inset_3px_0_0_var(--console-magenta)]'
                      : launch.isLive
                        ? 'bg-[var(--console-amber)]/[0.055] shadow-[inset_3px_0_0_var(--console-amber)]'
                      : 'bg-[var(--surface-accent)] shadow-[inset_3px_0_0_var(--console-cyan)]'
                    : 'hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    launch.isLive
                      ? coverageUnconfirmed
                        ? 'bg-[var(--console-amber)]'
                        : 'status-dot-live bg-[var(--console-magenta)]'
                      : launch.status === 'failure' ||
                          isCriticalLaunchStatusName(launch.statusName)
                        ? 'bg-[var(--console-red)]'
                        : launch.status === 'tbd'
                        ? 'bg-[var(--console-amber)]'
                        : 'bg-[var(--console-green)]'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold leading-5 text-[var(--text-primary)]">
                    {launch.name}
                  </span>
                  <span className="mt-1 block text-xs leading-4 text-[var(--text-muted)]">
                    {formatLaunchDate(launch.date, launch.datePrecision)}
                  </span>
                  <span className="mt-0.5 block break-words text-xs leading-4 text-[var(--console-cyan)]">
                    {launch.provider || launch.rocket}
                  </span>
                  {selected ? (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--console-cyan)]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      On console
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  size={16}
                  className="shrink-0 text-[var(--text-muted)]"
                />
              </button>
            </Fragment>
          );
        })}
      </div>
      {queueTruncated ? (
        <div className="border-t border-[var(--border-subtle)] p-2">
          <Link
            href="/"
            className="action-button action-button-quiet w-full justify-between px-3"
          >
            View all {launches.length} missions
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

function WatchContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const {
    launches,
    online,
    loading: feedLoading,
    refreshing,
    error,
    meta,
    refresh,
  } = useLaunches();
  const { liveLaunches } = useLiveLaunches();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState(requestedId);
  const selectedMissionRef = useRef<HTMLDivElement>(null);
  const missionLinkRef = useRef<HTMLAnchorElement>(null);
  const coverageRegionRef = useRef<HTMLDivElement>(null);
  const retainedRetryRef = useRef<HTMLButtonElement>(null);
  const retryFocusPendingRef = useRef(false);
  const retainedRetryFocusPendingRef = useRef(false);
  const detailRetryFocusPendingRef = useRef(false);

  const queue = useMemo(() => {
    const byId = new Map<string, Launch>();
    [...liveLaunches, ...launches].forEach((launch) => byId.set(launch.id, launch));
    return [...byId.values()].sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return a.dateUnix - b.dateUnix;
    });
  }, [launches, liveLaunches]);

  const fallbackLaunch = liveLaunches[0] ?? queue[0] ?? null;
  const selectedId = selectedMissionId ?? fallbackLaunch?.id ?? null;
  const selected = useLaunchById(selectedId);
  const requestedUnavailable = Boolean(
    requestedId &&
      !selected.loading &&
      !selected.launch &&
      (selected.notFound || selected.error),
  );
  const selectedLaunch =
    selected.launch ?? (requestedUnavailable ? fallbackLaunch : null);
  const retainedSchedule = Boolean(
    queue.length > 0 && (!online || error || meta?.stale),
  );
  const coverageUnconfirmed = Boolean(!online || error || meta?.stale);
  const hasLiveCoverage = liveLaunches.length > 0 && !coverageUnconfirmed;
  const inFlightMissionCount = liveLaunches.filter(
    (launch) => getLaunchLiveSignal(launch) === 'mission',
  ).length;
  const liveBroadcastCount = liveLaunches.length - inFlightMissionCount;
  const confirmedLiveSummary =
    inFlightMissionCount > 0
      ? `${inFlightMissionCount} mission${inFlightMissionCount === 1 ? '' : 's'} in flight${
          liveBroadcastCount > 0
            ? ` · ${liveBroadcastCount} other live broadcast${liveBroadcastCount === 1 ? '' : 's'}`
            : ''
        }`
      : `${liveBroadcastCount} live broadcast${liveBroadcastCount === 1 ? '' : 's'}`;
  const selectedLiveCoverage = Boolean(
    selectedLaunch?.isLive && !coverageUnconfirmed,
  );
  const degradedSchedule = Boolean(
    retainedSchedule || meta?.partial,
  );
  const selectedDetailHref = selectedLaunch
    ? `/launch/${encodeURIComponent(selectedLaunch.id)}?from=watch`
    : '';
  const selectedPrimaryMissionName = selectedLaunch
    ? formatPrimaryMissionName(selectedLaunch)
    : '';
  const {
    intel,
    loading: intelLoading,
    error: intelError,
    retryAt: intelRetryAt,
    retry: retryIntel,
  } = useLaunchIntel(selectedLaunch, Boolean(selectedLaunch));

  useEffect(() => {
    setSelectedMissionId(requestedId);
  }, [requestedId]);

  useEffect(() => {
    const restoreSelection = (): void => {
      const params = new URLSearchParams(window.location.search);
      const ids = params.getAll('id');
      setSelectedMissionId(ids.length === 1 ? ids[0] : null);
    };

    window.addEventListener('popstate', restoreSelection);
    return () => window.removeEventListener('popstate', restoreSelection);
  }, []);

  useEffect(() => {
    detailRetryFocusPendingRef.current = false;
  }, [selectedId]);

  useEffect(() => {
    const resetSelection = (): void => setSelectedMissionId(null);
    window.addEventListener(RESET_WATCH_SELECTION_EVENT, resetSelection);
    return () =>
      window.removeEventListener(RESET_WATCH_SELECTION_EVENT, resetSelection);
  }, []);

  useEffect(() => {
    if (!selectedLaunch) return;

    const missionTitle = `${selectedLaunch.name} | Watch | LaunchWatch`;
    const maintainMissionTitle = (): void => {
      if (document.title !== missionTitle) document.title = missionTitle;
    };

    maintainMissionTitle();
    const titleObserver = new MutationObserver(maintainMissionTitle);
    titleObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => titleObserver.disconnect();
  }, [selectedLaunch]);

  useEffect(() => {
    if (!selectedLaunch || !retryFocusPendingRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      retryFocusPendingRef.current = false;
      missionLinkRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedLaunch]);

  useEffect(() => {
    if (!retainedRetryFocusPendingRef.current || refreshing) return;

    retainedRetryFocusPendingRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      if (error) retainedRetryRef.current?.focus();
      else missionLinkRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, refreshing]);

  useEffect(() => {
    if (!detailRetryFocusPendingRef.current || selected.enriching) return;

    detailRetryFocusPendingRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      coverageRegionRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selected.enriching]);

  const selectLaunch = (
    id: string,
    revealMission = false,
    historyMode: 'push' | 'replace' = 'replace',
  ): void => {
    setSelectedMissionId(id);
    const nextUrl = `/watch?id=${encodeURIComponent(id)}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      if (historyMode === 'push') {
        window.history.pushState(window.history.state, '', nextUrl);
      } else {
        window.history.replaceState(window.history.state, '', nextUrl);
      }
    }

    if (
      revealMission &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      window.requestAnimationFrame(() => {
        const mission = selectedMissionRef.current;
        if (!mission) return;

        const missionBounds = mission.getBoundingClientRect();
        const headerBottom =
          document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
        const navigationTop = Array.from(
          document.querySelectorAll<HTMLElement>(
            'nav[aria-label="Primary navigation"]'
          )
        )
          .map((navigation) => navigation.getBoundingClientRect())
          .find((bounds) => bounds.height > 0)?.top ?? window.innerHeight;
        const missionAlreadyVisible =
          missionBounds.top >= headerBottom - 1 &&
          missionBounds.bottom <= navigationTop + 1;
        if (missionAlreadyVisible) return;

        mission.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'start',
        });
      });
    }
  };

  const retrySchedule = (): void => {
    if (refreshing || !online) return;
    retryFocusPendingRef.current = true;
    void refresh();
  };

  const retryRetainedSchedule = (): void => {
    if (refreshing || !online) return;
    retainedRetryFocusPendingRef.current = true;
    void refresh();
  };

  const retryMissionDetails = (): void => {
    if (selected.retrying || !selected.error) return;
    detailRetryFocusPendingRef.current = true;
    selected.retry();
  };

  const loading =
    (feedLoading && queue.length === 0) ||
    (Boolean(requestedId) && selected.loading && !selected.launch);

  if (loading) {
    return <WatchLoadingState requestedMission={Boolean(requestedId)} />;
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
          aria-disabled={refreshing || !online}
          aria-busy={refreshing}
          className="action-button action-button-secondary mt-6 aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {refreshing
            ? 'Retrying watch schedule'
            : online
              ? 'Retry watch schedule'
              : 'Reconnect to retry'}
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

        <div
          className={`route-masthead mb-3 flex flex-wrap items-center justify-between gap-2 pb-2 min-[360px]:mb-6 min-[360px]:gap-3 ${
            hasLiveCoverage
              ? 'signal-live'
              : degradedSchedule
                ? 'signal-warm'
                : 'signal-cold'
          }`}
        >
          <div>
            <p
              className={`data-label ${
                hasLiveCoverage
                  ? 'text-[var(--console-magenta)]'
                  : 'text-[var(--console-cyan)]'
              }`}
            >
              Launch network / active console
            </p>
            <h1 className="section-title mt-1 text-[clamp(1.55rem,4vw,2.4rem)]">
              Watch room
            </h1>
            <p className="mt-1 hidden text-sm text-[var(--text-muted)] min-[360px]:block">
              {hasLiveCoverage
                ? confirmedLiveSummary
                : coverageUnconfirmed && liveLaunches.length > 0
                  ? `${liveLaunches.length} last-known live signal${liveLaunches.length === 1 ? '' : 's'} · coverage unconfirmed`
                : 'Provider streams and launch windows'}
              {meta?.partial && !coverageUnconfirmed
                ? ' · partial provider data'
                : ''}
            </p>
          </div>
          <StatusBadge
            status={selectedLaunch.status}
            statusName={selectedLaunch.statusName}
            unconfirmed={Boolean(
              selectedLaunch.isLive && coverageUnconfirmed,
            )}
          />
        </div>

        {retainedSchedule ? (
          <div
            role="status"
            className="mb-4 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--console-amber)]/30 bg-[var(--console-amber)]/[0.055] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-2 leading-5 text-[var(--text-secondary)]">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[var(--console-amber)]"
                size={16}
              />
              <span>
                <strong className="font-semibold text-[var(--console-amber)]">
                  {!online
                    ? 'Device is offline.'
                    : error
                      ? 'Refresh failed.'
                      : 'Provider cache is stale.'}
                </strong>{' '}
                Showing the last-known mission schedule.
                {liveLaunches.length > 0
                  ? ' Live coverage is unconfirmed until the feed recovers.'
                  : ' Mission timing may have changed.'}
              </span>
            </p>
            <button
              ref={retainedRetryRef}
              type="button"
              onClick={retryRetainedSchedule}
              aria-disabled={refreshing || !online}
              aria-busy={refreshing}
              className="action-button action-button-quiet w-full shrink-0 justify-center whitespace-nowrap text-[var(--console-amber)] aria-disabled:cursor-wait aria-disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                aria-hidden="true"
                size={15}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing
                ? 'Retrying feed'
                : online
                  ? 'Retry feed'
                  : 'Refresh when online'}
            </button>
          </div>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div
            data-watch-selected-mission
            className="contents lg:block lg:min-w-0"
          >
            <div
              ref={selectedMissionRef}
              data-watch-selected-stage
              className="order-1 min-w-0 scroll-mt-20"
            >
              <WatchStage
                launch={selectedLaunch}
                detailHref={selectedDetailHref}
                detailLoading={selected.enriching}
                detailRetrying={selected.retrying}
                coverageUnconfirmed={coverageUnconfirmed}
                coverageRegionRef={coverageRegionRef}
                onRetryDetails={retryMissionDetails}
                streamLookupError={selected.launch ? selected.error : null}
              />
            </div>

            <section
              data-watch-mission-details
              className={`surface-card holo-card order-3 p-5 sm:p-6 lg:mt-4 ${
                selectedLiveCoverage
                  ? 'signal-live'
                  : selectedLaunch.isLive && coverageUnconfirmed
                    ? 'signal-warm'
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
                      {selectedPrimaryMissionName}
                    </h2>
                  </Link>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {selectedLaunch.rocket} ·{' '}
                    {getLaunchSiteDisplay(selectedLaunch).label}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--console-cyan)]">
                    {formatLaunchDate(
                      selectedLaunch.date,
                      selectedLaunch.datePrecision
                    )}
                  </p>
                  <LocalLaunchTime
                    date={selectedLaunch.date}
                    precision={selectedLaunch.datePrecision}
                    className="mt-1 font-mono text-[0.7rem] leading-4 text-[var(--text-secondary)]"
                  />
                  <LaunchWindow
                    launch={selectedLaunch}
                    className="mt-2"
                  />
                </div>
                <LaunchActions
                  launch={selectedLaunch}
                  detailHref={selectedDetailHref}
                  onOpenBriefing={() => setBriefingOpen(true)}
                  compact
                  showPrimaryAction={false}
                  showShare
                  className="shrink-0"
                />
              </div>
              {selectedLaunch.description ? (
                <MissionDescription
                  description={selectedLaunch.description}
                  className="mt-5 max-w-4xl border-t border-[var(--border-subtle)] pt-5 text-sm leading-6 text-[var(--text-secondary)]"
                />
              ) : null}
            </section>
          </div>

          <div className="contents lg:col-start-2 lg:row-start-1 lg:block lg:min-w-0 lg:space-y-4">
            <div className="order-2 min-w-0">
              <MissionQueue
                launches={queue}
                selectedId={selectedLaunch.id}
                coverageUnconfirmed={coverageUnconfirmed}
                onSelect={selectLaunch}
              />
            </div>

            <div className="order-4 min-w-0">
              <WatchMissionVisual
                key={selectedLaunch.id}
                launch={selectedLaunch}
                loading={selected.enriching}
                error={selected.error}
                collapsible={Boolean(selectedLaunch.livestream)}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <LaunchIntelDeck
            launch={selectedLaunch}
            intel={intel}
            loading={intelLoading}
            error={intelError}
            retryAt={intelRetryAt}
            onRetry={retryIntel}
          />
          <aside className="surface-card holo-card signal-warm p-5">
            <h2 className="section-title text-[1.15rem]">Source & status</h2>
            <div
              className={`mt-4 flex items-center gap-2 text-sm ${
                degradedSchedule
                  ? 'text-[var(--console-amber)]'
                  : 'text-[var(--console-green)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  degradedSchedule
                    ? 'bg-[var(--console-amber)]'
                    : 'bg-[var(--console-green)]'
                }`}
              />
              {retainedSchedule
                ? online
                  ? 'Schedule status unconfirmed'
                  : 'Offline · schedule retained'
                : meta?.partial
                  ? 'Schedule partially available'
                  : 'Schedule online'}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Schedules and stream links are aggregated from official providers.
              Launch times can change.
            </p>
            <Link
              href="/history"
              className="action-button action-button-quiet -ml-4 mt-4"
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
  return <WatchLoadingState />;
}

export default function WatchPage(): React.ReactElement {
  return (
    <Suspense fallback={<WatchFallback />}>
      <WatchContent />
    </Suspense>
  );
}
