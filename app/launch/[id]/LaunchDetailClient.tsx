'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Radio,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LaunchTimeContext from '@/components/LaunchTimeContext';
import MissionDescription from '@/components/MissionDescription';
import TimelineEventClock from '@/components/TimelineEventClock';
import LaunchActions from '@/components/launch/LaunchActions';
import CoverageTimingSignal from '@/components/launch/CoverageTimingSignal';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import LaunchWindow from '@/components/launch/LaunchWindow';
import MissionVisual from '@/components/launch/MissionVisual';
import FirstStageSignal from '@/components/launch/FirstStageSignal';
import LaunchCadenceSignal from '@/components/launch/LaunchCadenceSignal';
import LaunchDesignatorSignal from '@/components/launch/LaunchDesignatorSignal';
import PadTurnaroundSignal from '@/components/launch/PadTurnaroundSignal';
import VehicleRecordSignal from '@/components/launch/VehicleRecordSignal';
import LaunchReadinessSignal from '@/components/launch/LaunchReadinessSignal';
import LaunchFailureSignal from '@/components/launch/LaunchFailureSignal';
import MissionProfileSignal from '@/components/launch/MissionProfileSignal';
import MissionOperatorSignal from '@/components/launch/MissionOperatorSignal';
import ProviderRevisionSignal from '@/components/launch/ProviderRevisionSignal';
import ProviderStatusSignal from '@/components/launch/ProviderStatusSignal';
import MissionUpdateLog from '@/components/launch/MissionUpdateLog';
import StatusBadge from '@/components/ui/StatusBadge';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import VideoPlayer from '@/components/video/VideoPlayer';
import TrajectoryErrorBoundary from '@/components/trajectory/TrajectoryErrorBoundary';
import {
  formatLaunchDate,
  formatPrimaryMissionName,
  formatTimelineOffset,
  getLaunchSiteDisplay,
  getLaunchLiveSignal,
  getTimelineEventDate,
  getTimelineProgress,
  hasCalendarReadyLaunchTime,
  hasExactLaunchTime,
  isCriticalLaunchStatusName,
  isCompletedLaunch,
} from '@/lib/format';
import {
  reconcileCurrentLaunch,
  useCurrentTime,
  useLaunchIntel,
} from '@/lib/hooks';
import {
  buildScheduleDetailHref,
  parseScheduleFilters,
} from '@/lib/schedule-return';
import { getScheduleResults } from '@/lib/schedule-results';
import type { Launch } from '@/lib/types';
import { extractYouTubeId } from '@/lib/youtube';
import { useDetailNavigationContext, useLaunchData } from '@/lib/contexts';

const TIMELINE_EVENT_WIDTH_PX = 176;
const INTELLIGENCE_PRELOAD_MARGIN_PX = 320;
const SECTION_ACTIVATION_GAP_PX = 32;
const subscribeToHydration = (): (() => void) => () => undefined;

function DetailTrajectoryLoadingState(): React.ReactElement {
  return (
    <div
      className="mission-trajectory-loading surface-card holo-card signal-cold min-h-[32rem] w-full min-w-0 max-w-full overflow-hidden"
    >
      <header className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.13em] text-[var(--text-secondary)]">
            Mission trajectory
          </h2>
          <span className="rounded border border-[rgba(88,200,232,0.3)] bg-[rgba(88,200,232,0.08)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.09em] text-[var(--console-cyan)]">
            Loading model
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Preparing the reported site and modeled mission phases
        </p>
      </header>

      <div aria-hidden="true">
        <div className="skeleton h-[10rem] w-full min-w-0 max-w-full rounded-none sm:h-[clamp(22rem,48vw,34rem)]" />
        <div className="grid border-t border-[var(--border-subtle)] md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={`flex min-h-[6.25rem] items-start gap-3 px-4 py-4 sm:px-5 ${
                index > 0
                  ? 'border-t border-[var(--border-subtle)] md:border-l md:border-t-0'
                  : ''
              }`}
            >
              <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="mission-trajectory-loading-facts grid grid-cols-2 border-t border-[var(--border-subtle)] md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`mission-trajectory-loading-fact min-h-[4.5rem] px-4 py-3 sm:px-5 ${
                index % 2 ? 'border-l border-[var(--border-subtle)]' : ''
              } ${
                index >= 2
                  ? 'border-t border-[var(--border-subtle)] md:border-t-0'
                  : ''
              } ${index > 0 ? 'md:border-l md:border-[var(--border-subtle)]' : ''}`}
            >
              <div className="skeleton h-2.5 w-16 rounded" />
              <div className="skeleton mt-2 h-3 w-full rounded" />
            </div>
          ))}
        </div>
        <div className="flex h-10 items-center border-t border-[var(--border-subtle)] px-4 sm:px-5">
          <div className="skeleton h-2.5 w-[min(28rem,80%)] rounded" />
        </div>
      </div>
    </div>
  );
}

const MissionTrajectory = dynamic(
  () => import('@/components/MissionTrajectory'),
  {
    loading: DetailTrajectoryLoadingState,
    ssr: false,
  },
);

function DeferredDetailTrajectory({
  launch,
}: {
  launch: Launch;
}): React.ReactElement {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const hostRef = useRef<HTMLElement>(null);

  const handleTrajectoryReady = useCallback((): void => {
    setReady(true);
  }, []);

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
        if (!entry.isIntersecting) return;
        setEnabled(true);
        observer.disconnect();
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [enabled]);

  return (
    <section
      ref={hostRef}
      id="mission-trajectory"
      tabIndex={-1}
      aria-label={
        failed
          ? 'Mission trajectory unavailable'
          : ready
            ? 'Mission trajectory'
            : 'Loading mission trajectory'
      }
      aria-busy={!ready && !failed ? 'true' : undefined}
      className="mission-detail-section-anchor mt-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)]"
    >
      {enabled ? (
        <TrajectoryErrorBoundary
          resetKey={launch.id}
          className="min-h-[32rem]"
          onError={() => {
            setReady(false);
            setFailed(true);
          }}
        >
          <MissionTrajectory
            embedded
            launch={launch}
            onReady={handleTrajectoryReady}
            variant="detail"
          />
        </TrajectoryErrorBoundary>
      ) : (
        <DetailTrajectoryLoadingState />
      )}
    </section>
  );
}

const DETAIL_SECTION_LINKS = [
  {
    id: 'mission-summary',
    label: 'Summary',
    updatesOnly: false,
    timelineOnly: false,
  },
  {
    id: 'mission-trajectory',
    label: 'Trajectory',
    updatesOnly: false,
    timelineOnly: false,
  },
  {
    id: 'mission-updates',
    label: 'Updates',
    updatesOnly: true,
    timelineOnly: false,
  },
  {
    id: 'mission-timeline',
    label: 'Timeline',
    updatesOnly: false,
    timelineOnly: true,
  },
  {
    id: 'mission-intelligence',
    label: 'Intelligence',
    updatesOnly: false,
    timelineOnly: false,
  },
  {
    id: 'mission-coverage',
    label: 'Coverage',
    updatesOnly: false,
    timelineOnly: false,
  },
] as const;
type DetailSectionId = (typeof DETAIL_SECTION_LINKS)[number]['id'];

function IntelligenceStandby({
  launchName,
}: {
  launchName: string;
}): React.ReactElement {
  return (
    <section
      aria-labelledby="mission-intelligence-standby-title"
      data-intelligence-standby="true"
      className="mission-intelligence-standby surface-card holo-card signal-cold overflow-hidden p-5 sm:p-6"
    >
      <div className="mission-intelligence-standby-heading flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--console-cyan)]">
          <Radio aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0">
          <p className="data-label text-[var(--console-cyan)]">
            Secondary signal
          </p>
          <h2
            id="mission-intelligence-standby-title"
            className="section-title mt-1 text-[1.2rem]"
          >
            Mission intelligence
          </h2>
        </div>
      </div>
      <div className="mission-intelligence-standby-status mt-5 flex items-center gap-2 border-y border-[var(--border-subtle)] py-3">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-[var(--console-cyan)]"
        />
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--console-cyan)]">
          Acquisition on standby
        </p>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        Coverage signals for{' '}
        <strong className="font-semibold text-[var(--text-primary)]">
          {launchName}
        </strong>{' '}
        will begin loading as this panel approaches the viewport.
      </p>
    </section>
  );
}

function handleTimelineKeyDown(
  event: KeyboardEvent<HTMLOListElement>
): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return;
  }

  event.preventDefault();
  event.currentTarget.scrollLeft +=
    event.key === 'ArrowLeft'
      ? -TIMELINE_EVENT_WIDTH_PX
      : TIMELINE_EVENT_WIDTH_PX;
}

export default function LaunchDetailClient({
  launch,
  returnToWatch = false,
  historyReturnHref = null,
  historyReturnFiltered = false,
  scheduleReturnHref = null,
  scheduleReturnQuery = null,
  scheduleReturnFiltered = false,
}: {
  launch: Launch;
  returnToWatch?: boolean;
  historyReturnHref?: string | null;
  historyReturnFiltered?: boolean;
  scheduleReturnHref?: string | null;
  scheduleReturnQuery?: string | null;
  scheduleReturnFiltered?: boolean;
}): React.ReactElement {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [scheduleReferenceTime] = useState(() => Date.now());
  const [activeSectionId, setActiveSectionId] =
    useState<DetailSectionId>('mission-summary');
  const [sectionIndexHeight, setSectionIndexHeight] = useState(0);
  const {
    launches: feedLaunches,
    online,
    loading: feedLoading,
    refreshing: feedRefreshing,
    error: feedError,
    meta: feedMeta,
    refresh: refreshFeed,
  } = useLaunchData();
  const feedLaunch = feedLaunches.find(
    (candidate) => candidate.id === launch.id,
  );
  const scheduleFilters = useMemo(
    () =>
      scheduleReturnHref
        ? parseScheduleFilters(
            new URLSearchParams(scheduleReturnQuery ?? ''),
          )
        : null,
    [scheduleReturnHref, scheduleReturnQuery],
  );
  const scheduleMissions = useMemo(
    () =>
      scheduleFilters
        ? getScheduleResults(
            feedLaunches,
            scheduleFilters,
            scheduleReferenceTime,
          )
        : [],
    [feedLaunches, scheduleFilters, scheduleReferenceTime],
  );
  const scheduleMissionIndex = scheduleMissions.findIndex(
    (candidate) => candidate.id === launch.id,
  );
  const previousScheduleMission =
    scheduleMissionIndex > 0
      ? scheduleMissions[scheduleMissionIndex - 1]
      : null;
  const nextScheduleMission =
    scheduleMissionIndex >= 0 &&
    scheduleMissionIndex < scheduleMissions.length - 1
      ? scheduleMissions[scheduleMissionIndex + 1]
      : null;
  const feedCanConfirmCurrentState =
    online && !feedLoading && !feedError && !feedMeta?.stale;
  const liveStatusUnconfirmed = Boolean(
    launch.isLive &&
      !feedLoading &&
      (!feedCanConfirmCurrentState || !feedLaunch?.isLive),
  );
  const currentFeedLaunch = feedCanConfirmCurrentState ? feedLaunch : null;
  const presentedLaunch: Launch = currentFeedLaunch
    ? (reconcileCurrentLaunch(currentFeedLaunch, launch) ?? launch)
    : liveStatusUnconfirmed
      ? { ...launch, isLive: false, webcastLive: false }
      : launch;
  const completed = isCompletedLaunch(presentedLaunch);
  const detailSectionLinks = useMemo(
    () =>
      DETAIL_SECTION_LINKS.filter(
        (section) =>
          (!section.timelineOnly || Boolean(launch.timeline?.length)) &&
          (!section.updatesOnly || Boolean(launch.providerUpdates?.length)),
      ),
    [launch.providerUpdates?.length, launch.timeline?.length],
  );
  const { setSource: setDetailNavigationSource } =
    useDetailNavigationContext();
  const sectionIndexInstructionsId = useId();
  const sectionIndexTrackId = useId();
  const [sectionIndexScroll, setSectionIndexScroll] = useState({
    overflowing: false,
    canMoveBackward: false,
    canMoveForward: false,
    firstVisible: 1,
    lastVisible: detailSectionLinks.length,
  });
  const [timelineScroll, setTimelineScroll] = useState({
    canMoveBackward: false,
    canMoveForward: false,
    firstVisible: 1,
    lastVisible: 1,
  });
  const sectionIndexRef = useRef<HTMLDivElement>(null);
  const sectionIndexNavRef = useRef<HTMLElement>(null);
  const activeSectionIdRef = useRef<DetailSectionId>('mission-summary');
  const resolvedInitialHashRef = useRef<string | null>(null);
  const timelineRef = useRef<HTMLOListElement>(null);
  const timelineNow = useCurrentTime();
  const timelineClockReady = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const intelligenceHostRef = useRef<HTMLDivElement>(null);
  const missionPanelRef = useRef<HTMLElement>(null);
  const feedRetryRef = useRef<HTMLButtonElement>(null);
  const feedRetryFocusPendingRef = useRef(false);
  const [intelligenceEnabledLaunchId, setIntelligenceEnabledLaunchId] =
    useState<string | null>(null);
  const intelligenceEnabled = intelligenceEnabledLaunchId === launch.id;
  const {
    intel,
    loading: intelLoading,
    offline: intelOffline,
    error: intelError,
    retryAt: intelRetryAt,
    retry: retryIntel,
  } = useLaunchIntel(presentedLaunch, intelligenceEnabled);

  useEffect(() => {
    if (!feedRetryFocusPendingRef.current || feedRefreshing) return;

    feedRetryFocusPendingRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      if (liveStatusUnconfirmed) feedRetryRef.current?.focus();
      else missionPanelRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [feedRefreshing, liveStatusUnconfirmed]);

  useLayoutEffect(() => {
    setDetailNavigationSource(completed ? 'history' : 'home');
    return () => setDetailNavigationSource(null);
  }, [completed, setDetailNavigationSource]);

  useEffect(() => {
    if (intelligenceEnabled) return;

    const host = intelligenceHostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') {
      const timeout = window.setTimeout(
        () => setIntelligenceEnabledLaunchId(launch.id),
        0
      );
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIntelligenceEnabledLaunchId(launch.id);
        observer.disconnect();
      },
      { rootMargin: `${INTELLIGENCE_PRELOAD_MARGIN_PX}px 0px` }
    );
    observer.observe(host);

    return () => observer.disconnect();
  }, [intelligenceEnabled, launch.id]);

  const timelineEventCount = launch.timeline?.length ?? 0;
  const timelineProgress = timelineClockReady && launch.timeline
    ? getTimelineProgress(
        presentedLaunch.date,
        launch.timeline,
        presentedLaunch.datePrecision,
        timelineNow
      )
    : null;
  const nextTimelineEvent = timelineProgress?.nextIndex === null ||
    timelineProgress?.nextIndex === undefined
    ? null
    : launch.timeline?.[timelineProgress.nextIndex] ?? null;
  const hasPlayableVideo = Boolean(
    presentedLaunch.livestream && extractYouTubeId(presentedLaunch.livestream)
  );
  const missionTone = liveStatusUnconfirmed
    ? 'signal-warm'
    : presentedLaunch.isLive
      ? 'signal-live'
      : presentedLaunch.status === 'failure' ||
          isCriticalLaunchStatusName(presentedLaunch.statusName)
      ? 'signal-critical'
      : presentedLaunch.status === 'tbd'
        ? 'signal-warm'
        : completed
          ? 'signal-nominal'
          : 'signal-cold';
  const liveSignal = getLaunchLiveSignal(presentedLaunch);
  const returnHref = returnToWatch
    ? `/watch?id=${encodeURIComponent(launch.id)}&focus=${encodeURIComponent(launch.id)}`
    : historyReturnHref ?? scheduleReturnHref ?? (completed ? '/history' : '/');
  const returnLabel = returnToWatch
    ? 'Back to watch room'
    : historyReturnHref
      ? historyReturnFiltered
        ? 'Back to filtered archive'
        : 'Back to history'
      : scheduleReturnHref
        ? scheduleReturnFiltered
          ? 'Back to filtered schedule'
          : 'Back to launches'
        : completed
          ? 'Back to history'
          : 'Back to launches';
  const primaryMissionName = formatPrimaryMissionName(presentedLaunch);
  const missionVisual = (
    <MissionVisual
      launch={presentedLaunch}
      priority
      sizes="(max-width: 1023px) calc(100vw - 2rem), (max-width: 1471px) 52vw, 48rem"
      className="mission-summary-visual lg:col-start-1 lg:row-start-2"
      showUnavailableState
    />
  );
  const missionTelemetry = (
    <section
      aria-label="Mission telemetry"
      className="mission-telemetry-panel surface-card holo-card signal-cold rounded-[var(--radius-md)] p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1"
    >
      {!completed && liveSignal !== 'mission' ? (
        <div className="border-b border-[var(--border-subtle)] pb-5">
          {liveSignal === 'coverage' ? (
            <p className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--console-magenta)]">
              <span
                aria-hidden="true"
                className="status-dot-live h-2 w-2 rounded-full bg-[var(--console-magenta)]"
              />
              Coverage live
            </p>
          ) : null}
          <p className="data-label">
            {liveSignal === 'coverage' ? 'Launch target' : 'T-minus'}
          </p>
          <Countdown
            targetDate={presentedLaunch.date}
            precision={presentedLaunch.datePrecision}
            windowStart={presentedLaunch.windowStart}
            windowEnd={presentedLaunch.windowEnd}
            className="mt-3 lg:[&>.countdown-display]:!text-[clamp(1.8rem,3.1vw,3rem)]"
          />
        </div>
      ) : liveSignal === 'mission' ? (
        <div className="border-b border-[var(--border-subtle)] pb-5">
          <p className="data-label">Mission state</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[var(--console-magenta)]">
            IN FLIGHT
          </p>
        </div>
      ) : null}

      <dl className={`${!completed || presentedLaunch.isLive ? 'mt-5' : ''} space-y-4`}>
        <ProviderStatusSignal launch={presentedLaunch} variant="compact" />
        <div className="mission-telemetry-item relative pl-8">
          <MapPin
            aria-hidden="true"
            size={18}
            className="absolute left-0 top-0.5 text-[var(--text-muted)]"
          />
          <dt className="data-label">Launch site</dt>
          <dd className="mt-1 text-sm text-[var(--text-primary)]">
            {getLaunchSiteDisplay(presentedLaunch).label}
          </dd>
        </div>
        <div className="mission-telemetry-item relative pl-8">
          <Rocket
            aria-hidden="true"
            size={18}
            className="absolute left-0 top-0.5 text-[var(--text-muted)]"
          />
          <dt className="data-label">Launch vehicle</dt>
          <dd className="mt-1 text-sm text-[var(--text-primary)]">
            {presentedLaunch.rocket}
          </dd>
        </div>
        <ProviderRevisionSignal
          updatedAt={presentedLaunch.providerUpdatedAt}
          variant="compact"
        />
        <LaunchDesignatorSignal
          designator={presentedLaunch.launchDesignator}
          compact
        />
        <LaunchCadenceSignal launch={presentedLaunch} variant="compact" />
        <PadTurnaroundSignal
          seconds={presentedLaunch.padTurnaroundSeconds}
          compact
        />
        <LaunchReadinessSignal launch={presentedLaunch} variant="compact" />
        <LaunchFailureSignal launch={presentedLaunch} compact />
        <VehicleRecordSignal
          record={presentedLaunch.vehicleRecord}
          compact
        />
        <FirstStageSignal firstStage={presentedLaunch.firstStage} compact />
        <MissionProfileSignal launch={presentedLaunch} variant="compact" />
        <MissionOperatorSignal
          missionAgencies={presentedLaunch.missionAgencies}
          compact
        />
        {presentedLaunch.officialMissionUrl ? (
          <div className="mission-telemetry-item relative pl-8">
            <ExternalLink
              aria-hidden="true"
              size={18}
              className="absolute left-0 top-0.5 text-[var(--console-cyan)]"
            />
            <dt className="data-label">Mission source</dt>
            <dd>
              <a
                href={presentedLaunch.officialMissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="-my-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--console-cyan)] transition-colors hover:text-[var(--text-primary)]"
              >
                Official page
                <ExternalLink aria-hidden="true" size={14} />
                <ExternalLinkHint />
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );

  const updateSectionIndexControls = useCallback((): void => {
    const track = sectionIndexRef.current;
    if (!track) return;

    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    const trackBounds = track.getBoundingClientRect();
    const visibleIndexes = [...track.children].flatMap((child, index) => {
      const bounds = child.getBoundingClientRect();
      const visibleWidth = Math.max(
        0,
        Math.min(bounds.right, trackBounds.right) -
          Math.max(bounds.left, trackBounds.left),
      );
      return visibleWidth >= bounds.width - 1 ? [index] : [];
    });
    const fallbackIndex = Math.min(
      Math.max(0, detailSectionLinks.length - 1),
      Math.max(
        0,
        Math.round(
          (track.scrollLeft / Math.max(1, maxScrollLeft)) *
            Math.max(0, detailSectionLinks.length - 1),
        ),
      ),
    );
    const firstVisible = (visibleIndexes[0] ?? fallbackIndex) + 1;
    const lastVisible =
      (visibleIndexes[visibleIndexes.length - 1] ?? fallbackIndex) + 1;
    const next = {
      overflowing: maxScrollLeft > 1,
      canMoveBackward: track.scrollLeft > 1,
      canMoveForward: track.scrollLeft < maxScrollLeft - 1,
      firstVisible,
      lastVisible,
    };

    setSectionIndexScroll((current) =>
      current.overflowing === next.overflowing &&
      current.canMoveBackward === next.canMoveBackward &&
      current.canMoveForward === next.canMoveForward &&
      current.firstVisible === next.firstVisible &&
      current.lastVisible === next.lastVisible
        ? current
        : next,
    );
  }, [detailSectionLinks.length]);

  useEffect(() => {
    const track = sectionIndexRef.current;
    if (!track) return;

    track.scrollLeft = 0;
    const frame = window.requestAnimationFrame(updateSectionIndexControls);
    const resizeObserver = new ResizeObserver(updateSectionIndexControls);
    resizeObserver.observe(track);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [launch.id, detailSectionLinks.length, updateSectionIndexControls]);

  useLayoutEffect(() => {
    const sectionIndex = sectionIndexNavRef.current;
    if (!sectionIndex) return;

    const updateHeight = (): void => {
      setSectionIndexHeight((current) => {
        const next = Math.ceil(sectionIndex.getBoundingClientRect().height);
        return current === next ? current : next;
      });
    };
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(sectionIndex);
    return () => resizeObserver.disconnect();
  }, [launch.id, detailSectionLinks.length]);

  useEffect(() => {
    activeSectionIdRef.current = activeSectionId;
  }, [activeSectionId]);

  useEffect(() => {
    if (sectionIndexHeight <= 0) return;

    const hash = window.location.hash.slice(1) as DetailSectionId;
    const section = detailSectionLinks.find(({ id }) => id === hash);
    const resolutionKey = section ? `${launch.id}:${section.id}` : launch.id;
    if (!section || resolvedInitialHashRef.current === resolutionKey) return;

    resolvedInitialHashRef.current = resolutionKey;
    activeSectionIdRef.current = section.id;
    let correctionFrame: number | null = null;
    const frame = window.requestAnimationFrame(() => {
      setActiveSectionId(section.id);
      const target = document.getElementById(section.id);
      target?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
      correctionFrame = window.requestAnimationFrame(() => {
        const sectionIndex = sectionIndexNavRef.current;
        if (!target || !sectionIndex) return;
        const targetTop = target.getBoundingClientRect().top;
        const requiredTop =
          sectionIndex.getBoundingClientRect().bottom +
          SECTION_ACTIVATION_GAP_PX;
        if (targetTop < requiredTop) {
          window.scrollBy({
            top: targetTop - requiredTop,
            behavior: 'auto',
          });
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (correctionFrame !== null) {
        window.cancelAnimationFrame(correctionFrame);
      }
    };
  }, [detailSectionLinks, launch.id, sectionIndexHeight]);

  useEffect(() => {
    let frame: number | null = null;

    const updateActiveSection = (): void => {
      frame = null;
      const sectionIndex = sectionIndexNavRef.current;
      const headerBottom =
        document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      const activationLine = Math.max(
        headerBottom,
        sectionIndex?.getBoundingClientRect().bottom ?? headerBottom,
      ) + SECTION_ACTIVATION_GAP_PX;
      const positions = detailSectionLinks.flatMap((section) => {
        const element = document.getElementById(section.id);
        if (!element) return [];
        const bounds = element.getBoundingClientRect();
        return [{ id: section.id, top: bounds.top, bottom: bounds.bottom }];
      });
      const passed = positions.filter(({ top }) => top <= activationLine + 2);
      const furthestTop = passed.length
        ? Math.max(...passed.map(({ top }) => top))
        : positions[0]?.top;
      const candidates = positions.filter(
        ({ top }) => furthestTop !== undefined && Math.abs(top - furthestTop) <= 2,
      );
      const focusedSection = positions.find(
        ({ id, top, bottom }) =>
          document.activeElement?.id === id &&
          bottom > activationLine &&
          top < window.innerHeight,
      );
      const next =
        focusedSection?.id ??
        candidates.find(({ id }) => id === activeSectionIdRef.current)?.id ??
        candidates[0]?.id ??
        'mission-summary';

      if (next !== activeSectionIdRef.current) {
        activeSectionIdRef.current = next;
        setActiveSectionId(next);
      }
    };
    const scheduleUpdate = (): void => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [detailSectionLinks, launch.id, sectionIndexHeight]);

  useEffect(() => {
    const track = sectionIndexRef.current;
    const link = track?.querySelector<HTMLElement>(
      `[data-mission-section-id="${activeSectionId}"]`,
    );
    if (!track || !link) return;

    const trackBounds = track.getBoundingClientRect();
    const linkBounds = link.getBoundingClientRect();
    const leftDelta = linkBounds.left - trackBounds.left;
    const rightDelta = linkBounds.right - trackBounds.right;
    if (leftDelta < -1) track.scrollBy({ left: leftDelta, behavior: 'auto' });
    else if (rightDelta > 1) {
      track.scrollBy({ left: rightDelta, behavior: 'auto' });
    }
  }, [activeSectionId]);

  const moveSectionIndex = (direction: -1 | 1): void => {
    const track = sectionIndexRef.current;
    if (!track) return;

    track.scrollBy({
      left: direction * Math.max(120, Math.floor(track.clientWidth * 0.72)),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  const handleSectionIndexKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    moveSectionIndex(event.key === 'ArrowLeft' ? -1 : 1);
  };

  const updateTimelineControls = useCallback((): void => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const maxScrollLeft = Math.max(
      0,
      timeline.scrollWidth - timeline.clientWidth
    );
    const canMoveBackward = timeline.scrollLeft > 1;
    const canMoveForward = timeline.scrollLeft < maxScrollLeft - 1;
    const timelineBounds = timeline.getBoundingClientRect();
    const visibleIndexes = [...timeline.children].flatMap((child, index) => {
      const bounds = child.getBoundingClientRect();
      const visibleWidth = Math.max(
        0,
        Math.min(bounds.right, timelineBounds.right) -
          Math.max(bounds.left, timelineBounds.left)
      );
      return visibleWidth >= bounds.width / 2
        ? [index]
        : [];
    });
    const fallbackIndex = Math.min(
      Math.max(0, timelineEventCount - 1),
      Math.max(0, Math.round(timeline.scrollLeft / TIMELINE_EVENT_WIDTH_PX))
    );
    const firstVisible = (visibleIndexes[0] ?? fallbackIndex) + 1;
    const lastVisible =
      (visibleIndexes[visibleIndexes.length - 1] ?? fallbackIndex) + 1;
    setTimelineScroll((current) =>
      current.canMoveBackward === canMoveBackward &&
      current.canMoveForward === canMoveForward &&
      current.firstVisible === firstVisible &&
      current.lastVisible === lastVisible
        ? current
        : { canMoveBackward, canMoveForward, firstVisible, lastVisible }
    );
  }, [timelineEventCount]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    timeline.scrollLeft = 0;
    updateTimelineControls();
    const resizeObserver = new ResizeObserver(updateTimelineControls);
    resizeObserver.observe(timeline);

    return () => resizeObserver.disconnect();
  }, [launch.id, launch.timeline?.length, updateTimelineControls]);

  const moveTimeline = (direction: -1 | 1): void => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const currentEvent = Math.round(
      timeline.scrollLeft / TIMELINE_EVENT_WIDTH_PX
    );
    const nextLeft = Math.max(
      0,
      (currentEvent + direction) * TIMELINE_EVENT_WIDTH_PX
    );
    timeline.scrollTo({
      left: nextLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  const revealTimelineEvent = (index: number): void => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    timeline.scrollTo({
      left: Math.max(0, index * TIMELINE_EVENT_WIDTH_PX),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  return (
    <>
      <div
        className="mission-detail-page page-container py-4 sm:py-6 lg:py-8"
        style={{
          '--mission-section-index-height': `${sectionIndexHeight}px`,
        } as CSSProperties}
      >
        <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between">
          <Link
            href={returnHref}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--console-cyan)]"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            {returnLabel}
          </Link>

          {scheduleFilters ? (
            <nav
              aria-label="Adjacent schedule missions"
              style={{
                width:
                  previousScheduleMission && nextScheduleMission
                    ? 'min(100%, 44rem)'
                    : 'min(100%, 22rem)',
              }}
              className={`grid min-w-0 gap-2 sm:ml-auto ${
                previousScheduleMission && nextScheduleMission
                  ? 'sm:grid-cols-2'
                  : ''
              }`}
            >
              {previousScheduleMission ? (
                <Link
                  href={buildScheduleDetailHref(
                    previousScheduleMission.id,
                    scheduleFilters,
                  )}
                  prefetch={false}
                  className="group grid min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 text-left transition-colors hover:border-[var(--border-accent)] hover:bg-[var(--surface-subtle)]"
                >
                  <ChevronLeft
                    aria-hidden="true"
                    size={17}
                    className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--console-cyan)]"
                  />
                  <span className="min-w-0">
                    <span className="data-label block text-[var(--console-cyan)]">
                      Previous mission
                    </span>
                    <span className="mt-0.5 block break-words text-xs leading-4 text-[var(--text-secondary)]">
                      {previousScheduleMission.name}
                    </span>
                  </span>
                </Link>
              ) : null}

              {nextScheduleMission ? (
                <Link
                  href={buildScheduleDetailHref(
                    nextScheduleMission.id,
                    scheduleFilters,
                  )}
                  prefetch={false}
                  className="group grid min-h-11 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 text-right transition-colors hover:border-[var(--border-accent)] hover:bg-[var(--surface-subtle)]"
                >
                  <span className="min-w-0">
                    <span className="data-label block text-[var(--console-cyan)]">
                      Next mission
                    </span>
                    <span className="mt-0.5 block break-words text-xs leading-4 text-[var(--text-secondary)]">
                      {nextScheduleMission.name}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    size={17}
                    className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--console-cyan)]"
                  />
                </Link>
              ) : null}

              {!previousScheduleMission && !nextScheduleMission ? (
                <p
                  role="status"
                  className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-muted)]"
                >
                  {feedLoading && feedLaunches.length === 0
                    ? 'Syncing adjacent missions'
                    : feedError && feedLaunches.length === 0
                      ? 'Adjacent missions unavailable'
                      : scheduleMissionIndex < 0
                        ? 'Mission no longer matches this schedule view'
                        : 'Only mission in this schedule view'}
                </p>
              ) : null}
            </nav>
          ) : null}
        </div>

        {liveStatusUnconfirmed ? (
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
                  Live status unconfirmed.
                </strong>{' '}
                This mission detail is not confirmed by the current launch
                feed. Official coverage remains available without autoplay.
              </span>
            </p>
            <button
              ref={feedRetryRef}
              type="button"
              onClick={() => {
                if (feedRefreshing || !online) return;
                feedRetryFocusPendingRef.current = true;
                void refreshFeed();
              }}
              aria-disabled={feedRefreshing || !online}
              aria-busy={feedRefreshing}
              className="action-button action-button-quiet w-full shrink-0 justify-center whitespace-nowrap text-[var(--console-amber)] aria-disabled:cursor-wait aria-disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                aria-hidden="true"
                size={15}
                className={feedRefreshing ? 'animate-spin' : ''}
              />
              {feedRefreshing
                ? 'Retrying launch feed'
                : online
                  ? 'Retry launch feed'
                  : 'Refresh when online'}
            </button>
          </div>
        ) : null}

        <section
          id="mission-summary"
          ref={missionPanelRef}
          tabIndex={-1}
          className={`mission-detail-section-anchor mission-summary-panel surface-card holo-card ${missionTone} grid min-w-0 items-start gap-7 overflow-hidden p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] sm:p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)] lg:gap-x-10 lg:gap-y-6`}
        >
          <div
            data-mission-summary-context
            className="min-w-0 lg:col-start-1 lg:row-start-1"
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={presentedLaunch.status}
                statusName={presentedLaunch.statusName}
                unconfirmed={liveStatusUnconfirmed}
              />
              {presentedLaunch.provider ? (
                <span className="text-sm text-[var(--text-muted)]">
                  {presentedLaunch.provider}
                </span>
              ) : null}
            </div>

            <h1 className="mission-summary-title mt-5 max-w-5xl break-words text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[0.98] tracking-[-0.06em] text-[var(--text-primary)]">
              {primaryMissionName}
            </h1>

            <p className="mt-5 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <CalendarDays
                aria-hidden="true"
                size={17}
                className="text-[var(--console-amber)]"
              />
              {formatLaunchDate(
                presentedLaunch.date,
                presentedLaunch.datePrecision,
              )}
            </p>
            {!completed ? (
              <LaunchTimeContext
                launch={presentedLaunch}
                className="mt-1 pl-6 font-mono text-xs text-[var(--text-secondary)]"
              />
            ) : null}
            <LaunchWindow
              launch={presentedLaunch}
              className="mt-2 min-[360px]:mt-3"
            />

            <LaunchActions
              launch={presentedLaunch}
              onOpenBriefing={() => setBriefingOpen(true)}
              showCalendar={!completed}
              showShare
              detail
              className="mt-1 min-[360px]:mt-5"
            />

            <a
              href="#mission-sections"
              className="action-button action-button-quiet mt-3 w-full justify-center text-[var(--console-cyan)] sm:w-auto"
            >
              Jump to mission index
              <ChevronRight aria-hidden="true" size={16} />
            </a>

            {launch.description ? (
              <MissionDescription
                description={launch.description}
                className="mission-summary-description mt-6 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base sm:leading-7"
              />
            ) : (
              <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7">
                Mission description pending from the provider.
              </p>
            )}
          </div>

          {completed ? missionVisual : missionTelemetry}
          {completed ? missionTelemetry : missionVisual}
        </section>

        <nav
          id="mission-sections"
          ref={sectionIndexNavRef}
          tabIndex={-1}
          aria-label="Mission sections"
          className="mission-section-index surface-card holo-card signal-cold !sticky top-[calc(3.5rem+var(--safe-area-top))] z-40 mt-5 min-w-0 max-w-full overflow-hidden bg-[color:var(--surface-header)] shadow-[0_10px_24px_rgba(0,0,0,0.34)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] sm:top-[calc(4.375rem+var(--safe-area-top))]"
        >
          <div className="mission-section-index-header flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-5">
            <p className="data-label text-[var(--console-cyan)]">
              Mission index
            </p>
            {sectionIndexScroll.overflowing ? (
              <div className="flex w-full items-center justify-between gap-2 min-[360px]:w-auto min-[360px]:justify-end">
                <p
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-muted)]"
                >
                  <span className="sr-only">
                    {detailSectionLinks.length} sections. Showing{' '}
                  </span>
                  {sectionIndexScroll.firstVisible ===
                  sectionIndexScroll.lastVisible
                    ? sectionIndexScroll.firstVisible
                    : `${sectionIndexScroll.firstVisible}–${sectionIndexScroll.lastVisible}`}{' '}
                  of {detailSectionLinks.length}
                </p>
                <div
                  role="group"
                  aria-label="Mission index navigation"
                  className="flex items-center gap-1.5"
                >
                  <button
                    type="button"
                    aria-label="Previous mission sections"
                    aria-controls={sectionIndexTrackId}
                    aria-disabled={!sectionIndexScroll.canMoveBackward}
                    tabIndex={sectionIndexScroll.canMoveBackward ? undefined : -1}
                    onClick={() => {
                      if (sectionIndexScroll.canMoveBackward) {
                        moveSectionIndex(-1);
                      }
                    }}
                    className="icon-button h-11 w-11 aria-disabled:cursor-default aria-disabled:opacity-35"
                  >
                    <ChevronLeft aria-hidden="true" size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next mission sections"
                    aria-controls={sectionIndexTrackId}
                    aria-disabled={!sectionIndexScroll.canMoveForward}
                    tabIndex={sectionIndexScroll.canMoveForward ? undefined : -1}
                    onClick={() => {
                      if (sectionIndexScroll.canMoveForward) {
                        moveSectionIndex(1);
                      }
                    }}
                    className="icon-button h-11 w-11 aria-disabled:cursor-default aria-disabled:opacity-35"
                  >
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {detailSectionLinks.length} sections
              </p>
            )}
          </div>
          {sectionIndexScroll.overflowing ? (
            <p id={sectionIndexInstructionsId} className="sr-only">
              Use the previous and next buttons, horizontal scrolling, or the
              left and right arrow keys to reveal every mission section.
            </p>
          ) : null}
          <div
            id={sectionIndexTrackId}
            ref={sectionIndexRef}
            data-mission-section-track
            tabIndex={sectionIndexScroll.overflowing ? 0 : undefined}
            aria-describedby={
              sectionIndexScroll.overflowing
                ? sectionIndexInstructionsId
                : undefined
            }
            onKeyDown={handleSectionIndexKeyDown}
            onScroll={updateSectionIndexControls}
            className="mission-section-index-track flex min-w-0 max-w-full overflow-x-auto border-t border-[var(--border-subtle)] overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)]"
          >
            {detailSectionLinks.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                data-mission-section-id={section.id}
                aria-current={
                  activeSectionId === section.id ? 'location' : undefined
                }
                onClick={() => {
                  activeSectionIdRef.current = section.id;
                  setActiveSectionId(section.id);
                }}
                className={`group inline-flex min-h-11 shrink-0 items-center gap-2 border-r border-[var(--border-subtle)] px-4 font-mono text-xs font-semibold transition-colors last:border-r-0 hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${
                  activeSectionId === section.id
                    ? 'bg-[var(--surface-accent)] text-[var(--console-green)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`text-[0.62rem] group-hover:text-[var(--console-green)] ${
                    activeSectionId === section.id
                      ? 'text-[var(--console-green)]'
                      : 'text-[var(--console-cyan)]'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                {section.label}
              </a>
            ))}
          </div>
        </nav>

        <DeferredDetailTrajectory launch={presentedLaunch} />

        <MissionUpdateLog providerUpdates={launch.providerUpdates} />

        {launch.timeline?.length ? (
          <section
            id="mission-timeline"
            tabIndex={-1}
            aria-labelledby="launch-timeline-title"
            className="mission-detail-section-anchor mission-timeline-panel surface-card holo-card signal-warm mt-5 min-w-0 max-w-full overflow-hidden p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] sm:p-6"
          >
            <div className="mission-timeline-header flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 id="launch-timeline-title" className="section-title">
                  Launch timeline
                </h2>
                <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {hasCalendarReadyLaunchTime(presentedLaunch.datePrecision)
                    ? `Mission clock // derived from ${
                        hasExactLaunchTime(presentedLaunch.datePrecision)
                          ? 'provider T-0'
                          : 'estimated provider T-0'
                      }`
                    : 'Event clock pending a minute-level provider target'}
                </p>
              </div>
              <div className="mission-timeline-status flex items-center gap-2">
                <span
                  id="launch-timeline-position"
                  role="status"
                  aria-label="Timeline position"
                  aria-live="polite"
                  aria-atomic="true"
                  className="data-label mr-1"
                >
                  {timelineScroll.firstVisible === timelineScroll.lastVisible
                    ? `Event ${timelineScroll.firstVisible} of ${launch.timeline.length}`
                    : `Events ${timelineScroll.firstVisible}–${timelineScroll.lastVisible} of ${launch.timeline.length}`}
                </span>
                <div
                  role="group"
                  aria-label="Timeline navigation"
                  className="flex items-center gap-1.5"
                >
                  <button
                    type="button"
                    aria-label="Previous timeline event"
                    aria-controls="launch-timeline-events"
                    aria-describedby="launch-timeline-position"
                    aria-disabled={!timelineScroll.canMoveBackward}
                    tabIndex={timelineScroll.canMoveBackward ? undefined : -1}
                    onClick={() => moveTimeline(-1)}
                    className="icon-button h-11 w-11 aria-disabled:cursor-default aria-disabled:opacity-35"
                  >
                    <ChevronLeft aria-hidden="true" size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next timeline event"
                    aria-controls="launch-timeline-events"
                    aria-describedby="launch-timeline-position"
                    aria-disabled={!timelineScroll.canMoveForward}
                    tabIndex={timelineScroll.canMoveForward ? undefined : -1}
                    onClick={() => moveTimeline(1)}
                    className="icon-button h-11 w-11 aria-disabled:cursor-default aria-disabled:opacity-35"
                  >
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>
            </div>
            {timelineProgress ? (
              nextTimelineEvent && timelineProgress.nextIndex !== null ? (
                <button
                  type="button"
                  data-timeline-progress="next"
                  aria-label={`Show next mission milestone: ${nextTimelineEvent.type}`}
                  onClick={() => revealTimelineEvent(timelineProgress.nextIndex!)}
                  className="mt-4 flex min-h-11 w-full min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-green)_28%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--console-green)_5%,var(--surface-base))] px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--console-green)_9%,var(--surface-base))]"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--console-green)] shadow-[0_0_12px_rgba(94,230,168,0.45)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="data-label block text-[var(--console-green)]">
                      Next milestone
                    </span>
                    <span className="mt-0.5 block break-words text-sm font-semibold text-[var(--text-primary)]">
                      {nextTimelineEvent.type}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold text-[var(--console-cyan)]">
                    {formatTimelineOffset(nextTimelineEvent.relativeTime)}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    size={17}
                    className="shrink-0 text-[var(--text-muted)]"
                  />
                </button>
              ) : (
                <div
                  data-timeline-progress="elapsed"
                  role="status"
                  className="mt-4 flex min-h-11 min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--console-cyan)]/20 bg-[var(--console-cyan)]/[0.035] px-3 py-2"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--console-cyan)]"
                  />
                  <span className="min-w-0">
                    <span className="data-label block text-[var(--console-cyan)]">
                      Timed sequence elapsed
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-[var(--text-muted)]">
                      All {timelineProgress.validCount} provider-timed milestones are in the past; mission outcome remains provider-reported.
                    </span>
                  </span>
                </div>
              )
            ) : null}
            <p id="launch-timeline-instructions" className="sr-only">
              Use the previous and next event buttons, horizontal scrolling,
              or the left and right arrow keys to explore all timeline events.
            </p>
            <ol
              ref={timelineRef}
              id="launch-timeline-events"
              aria-describedby="launch-timeline-instructions launch-timeline-position"
              tabIndex={0}
              onKeyDown={handleTimelineKeyDown}
              onScroll={updateTimelineControls}
              className="mission-timeline-track mt-6 flex min-w-0 max-w-full snap-x snap-proximity gap-0 overflow-x-auto pb-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)]"
            >
              {launch.timeline.map((event, index) => {
                const eventDate = timelineClockReady
                  ? getTimelineEventDate(
                      presentedLaunch.date,
                      event.relativeTime,
                      presentedLaunch.datePrecision
                    )
                  : null;
                const eventState = !eventDate
                  ? 'unknown'
                  : eventDate.getTime() < timelineNow
                    ? 'elapsed'
                    : timelineProgress?.nextIndex === index
                      ? 'next'
                      : 'upcoming';

                return (
                  <li
                    key={`${event.relativeTime}-${event.type}`}
                    aria-current={eventState === 'next' ? 'step' : undefined}
                    data-timeline-state={eventState}
                    className={`relative min-w-[11rem] flex-1 snap-start border-t px-3 pt-5 first:pl-0 ${
                      eventState === 'next'
                        ? 'border-[var(--console-green)] bg-[var(--console-green)]/[0.035]'
                        : eventState === 'elapsed'
                          ? 'border-[var(--console-cyan)]/35'
                          : 'border-[var(--border-strong)]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -top-[5px] left-3 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-base)] ${
                        eventState === 'next'
                          ? 'bg-[var(--console-green)] shadow-[0_0_10px_rgba(94,230,168,0.5)]'
                          : eventState === 'elapsed'
                            ? 'bg-[var(--console-cyan)] opacity-70'
                            : 'bg-[var(--text-muted)]'
                      } first:left-0`}
                    />
                    <p className="whitespace-nowrap font-mono text-xs text-[var(--console-cyan)]">
                      {formatTimelineOffset(event.relativeTime)}
                    </p>
                    <TimelineEventClock
                      launchDate={presentedLaunch.date}
                      precision={presentedLaunch.datePrecision}
                      relativeTime={event.relativeTime}
                      className="mt-1.5"
                    />
                    <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {event.type}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      {event.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        <div className="mission-support-grid mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
          <div
            id="mission-intelligence"
            ref={intelligenceHostRef}
            tabIndex={-1}
            className="mission-detail-section-anchor min-w-0 max-w-full rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)]"
          >
            {intelligenceEnabled ? (
              <LaunchIntelDeck
                launch={presentedLaunch}
                intel={intel}
                loading={intelLoading}
                offline={intelOffline}
                error={intelError}
                retryAt={intelRetryAt}
                onRetry={retryIntel}
              />
            ) : (
              <IntelligenceStandby launchName={presentedLaunch.name} />
            )}
          </div>

          <section
            id="mission-coverage"
            tabIndex={-1}
            aria-labelledby={
              liveStatusUnconfirmed ? undefined : 'watch-replay-title'
            }
            aria-label={
              liveStatusUnconfirmed
                ? 'Mission coverage status unconfirmed'
                : undefined
            }
            className={`mission-detail-section-anchor surface-card holo-card min-w-0 max-w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${
              liveStatusUnconfirmed
                ? 'signal-warm'
                : presentedLaunch.isLive
                ? 'signal-live'
                : presentedLaunch.livestream
                  ? 'signal-cold'
                  : 'signal-warm'
            } p-5`}
          >
            <h2 id="watch-replay-title" className="section-title text-[1.2rem]">
              {completed
                ? hasPlayableVideo
                  ? 'Watch replay'
                  : 'Mission coverage'
                : hasPlayableVideo
                  ? 'Watch mission'
                  : 'Mission coverage'}
            </h2>
            <div
              className={`mt-4 overflow-hidden rounded-[var(--radius-sm)] border ${
                presentedLaunch.isLive
                  ? 'video-signal-frame border-[var(--console-magenta)]'
                  : presentedLaunch.livestream
                    ? 'border-[var(--border-strong)]'
                    : 'border-[var(--border-subtle)]'
              }`}
            >
              <CoverageTimingSignal
                launch={presentedLaunch}
                className="border-b border-[var(--console-cyan)]/20"
              />
              <VideoPlayer
                url={presentedLaunch.livestream}
                title={presentedLaunch.name}
                autoplay={presentedLaunch.isLive}
                live={presentedLaunch.isLive}
                launch={presentedLaunch}
                fitExternalContent
                className="rounded-none"
              />
            </div>
            {!presentedLaunch.livestream ? (
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                The provider has not attached a verified stream or replay yet.
              </p>
            ) : null}
          </section>
        </div>
      </div>

      <LaunchBriefingDrawer
        launch={presentedLaunch}
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
      />
    </>
  );
}
