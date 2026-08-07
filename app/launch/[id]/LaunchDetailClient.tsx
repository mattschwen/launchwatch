'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Orbit,
  Radio,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LocalLaunchTime from '@/components/LocalLaunchTime';
import MissionDescription from '@/components/MissionDescription';
import MissionTrajectory from '@/components/MissionTrajectory';
import LaunchActions from '@/components/launch/LaunchActions';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import LaunchWindow from '@/components/launch/LaunchWindow';
import MissionVisual from '@/components/launch/MissionVisual';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import StatusBadge from '@/components/ui/StatusBadge';
import VideoPlayer from '@/components/video/VideoPlayer';
import {
  firstLaunchValue,
  formatLaunchDate,
  formatPrimaryMissionName,
  formatTimelineOffset,
  getLaunchSiteDisplay,
  getLaunchLiveSignal,
  isCriticalLaunchStatusName,
  isCompletedLaunch,
} from '@/lib/format';
import { useLaunchIntel } from '@/lib/hooks';
import type { Launch } from '@/lib/types';
import { extractYouTubeId } from '@/lib/youtube';
import { useDetailNavigationContext, useLaunchData } from '@/lib/contexts';

const TIMELINE_EVENT_WIDTH_PX = 176;
const INTELLIGENCE_PRELOAD_MARGIN_PX = 320;

function IntelligenceStandby({
  launchName,
}: {
  launchName: string;
}): React.ReactElement {
  return (
    <section
      aria-labelledby="mission-intelligence-standby-title"
      data-intelligence-standby="true"
      className="surface-card holo-card signal-cold p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
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
      <div className="mt-5 flex items-center gap-2 border-y border-[var(--border-subtle)] py-3">
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
  scheduleReturnFiltered = false,
}: {
  launch: Launch;
  returnToWatch?: boolean;
  historyReturnHref?: string | null;
  historyReturnFiltered?: boolean;
  scheduleReturnHref?: string | null;
  scheduleReturnFiltered?: boolean;
}): React.ReactElement {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const {
    launches: feedLaunches,
    loading: feedLoading,
    refreshing: feedRefreshing,
    error: feedError,
    meta: feedMeta,
    refresh: refreshFeed,
  } = useLaunchData();
  const feedLaunch = feedLaunches.find(
    (candidate) => candidate.id === launch.id,
  );
  const feedCanConfirmCurrentState =
    !feedLoading && !feedError && !feedMeta?.stale;
  const liveStatusUnconfirmed = Boolean(
    launch.isLive &&
      !feedLoading &&
      (!feedCanConfirmCurrentState || !feedLaunch?.isLive),
  );
  const currentFeedLaunch = feedCanConfirmCurrentState ? feedLaunch : null;
  const presentedLaunch: Launch = currentFeedLaunch
    ? {
        ...launch,
        status: currentFeedLaunch.status,
        statusName: currentFeedLaunch.statusName,
        isLive: currentFeedLaunch.isLive,
        webcastLive: currentFeedLaunch.webcastLive,
      }
    : liveStatusUnconfirmed
      ? { ...launch, isLive: false, webcastLive: false }
      : launch;
  const completed = isCompletedLaunch(presentedLaunch);
  const { setSource: setDetailNavigationSource } =
    useDetailNavigationContext();
  const [timelineScroll, setTimelineScroll] = useState({
    canMoveBackward: false,
    canMoveForward: false,
    firstVisible: 1,
    lastVisible: 1,
  });
  const timelineRef = useRef<HTMLOListElement>(null);
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
    ? `/watch?id=${encodeURIComponent(launch.id)}`
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
      showUnavailableState
    />
  );
  const missionTelemetry = (
    <section
      aria-label="Mission telemetry"
      className="surface-card holo-card signal-cold rounded-[var(--radius-md)] p-5"
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
        <div className="relative pl-8">
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
        <div className="relative pl-8">
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
        <div className="relative pl-8">
          <Orbit
            aria-hidden="true"
            size={18}
            className="absolute left-0 top-0.5 text-[var(--text-muted)]"
          />
          <dt className="data-label">Mission profile</dt>
          <dd className="mt-1 text-sm text-[var(--text-primary)]">
            {firstLaunchValue([
              presentedLaunch.orbit,
              presentedLaunch.missionType,
            ])}
          </dd>
        </div>
      </dl>
    </section>
  );

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

  return (
    <>
      <div className="page-container py-4 sm:py-6 lg:py-8">
        <Link
          href={returnHref}
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--console-cyan)]"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          {returnLabel}
        </Link>

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
                if (feedRefreshing) return;
                feedRetryFocusPendingRef.current = true;
                void refreshFeed();
              }}
              aria-disabled={feedRefreshing}
              aria-busy={feedRefreshing}
              className="action-button action-button-quiet w-full shrink-0 justify-center whitespace-nowrap text-[var(--console-amber)] aria-disabled:cursor-wait aria-disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                aria-hidden="true"
                size={15}
                className={feedRefreshing ? 'animate-spin' : ''}
              />
              {feedRefreshing ? 'Retrying launch feed' : 'Retry launch feed'}
            </button>
          </div>
        ) : null}

        <section
          ref={missionPanelRef}
          tabIndex={-1}
          className={`surface-card holo-card ${missionTone} grid min-w-0 gap-7 p-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--console-cyan)] sm:p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)] lg:gap-10`}
        >
          <div className="min-w-0">
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

            <h1 className="mt-5 max-w-5xl break-words text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[0.98] tracking-[-0.06em] text-[var(--text-primary)]">
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
              <LocalLaunchTime
                date={presentedLaunch.date}
                precision={presentedLaunch.datePrecision}
                className="mt-1 pl-6 font-mono text-xs text-[var(--text-secondary)]"
              />
            ) : null}
            <LaunchWindow launch={presentedLaunch} className="mt-3" />

            <LaunchActions
              launch={presentedLaunch}
              onOpenBriefing={() => setBriefingOpen(true)}
              showCalendar={!completed}
              showShare
              detail
              className="mt-5"
            />

            {launch.description ? (
              <MissionDescription
                description={launch.description}
                className="mt-6 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base sm:leading-7"
              />
            ) : (
              <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7">
                Mission description pending from the provider.
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            {completed ? missionVisual : missionTelemetry}
            {completed ? missionTelemetry : missionVisual}
          </div>
        </section>

        <MissionTrajectory
          launch={presentedLaunch}
          variant="detail"
          className="mt-5"
        />

        {launch.timeline?.length ? (
          <section
            aria-labelledby="launch-timeline-title"
            className="surface-card holo-card signal-warm mt-5 overflow-hidden p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="launch-timeline-title" className="section-title">
                Launch timeline
              </h2>
              <div className="flex items-center gap-2">
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
              className="mt-6 flex snap-x snap-proximity gap-0 overflow-x-auto pb-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)]"
            >
              {launch.timeline.map((event, index) => (
                <li
                  key={`${event.relativeTime}-${event.type}`}
                  className="relative min-w-[11rem] flex-1 snap-start border-t border-[var(--border-strong)] px-3 pt-5 first:pl-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -top-[5px] left-3 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-base)] ${
                      index === 0
                        ? 'bg-[var(--console-green)]'
                        : 'bg-[var(--text-muted)]'
                    } first:left-0`}
                  />
                  <p className="whitespace-nowrap font-mono text-xs text-[var(--console-cyan)]">
                    {formatTimelineOffset(event.relativeTime)}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    {event.type}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    {event.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
          <div ref={intelligenceHostRef}>
            {intelligenceEnabled ? (
              <LaunchIntelDeck
                launch={presentedLaunch}
                intel={intel}
                loading={intelLoading}
                error={intelError}
                retryAt={intelRetryAt}
                onRetry={retryIntel}
              />
            ) : (
              <IntelligenceStandby launchName={presentedLaunch.name} />
            )}
          </div>

          <section
            aria-labelledby={
              liveStatusUnconfirmed ? undefined : 'watch-replay-title'
            }
            aria-label={
              liveStatusUnconfirmed
                ? 'Mission coverage status unconfirmed'
                : undefined
            }
            className={`surface-card holo-card ${
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
              <VideoPlayer
                url={presentedLaunch.livestream}
                title={presentedLaunch.name}
                autoplay={presentedLaunch.isLive}
                live={presentedLaunch.isLive}
                className="rounded-none"
              />
            </div>
            {presentedLaunch.livestream ? (
              <a
                href={presentedLaunch.livestream}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline ${
                  liveStatusUnconfirmed
                    ? 'text-[var(--console-amber)]'
                    : presentedLaunch.isLive
                    ? 'text-[var(--console-magenta)]'
                    : 'text-[var(--console-cyan)]'
                }`}
              >
                {hasPlayableVideo
                  ? 'Open official provider video'
                  : 'Open provider coverage'}
                <ExternalLink aria-hidden="true" size={15} />
                <ExternalLinkHint />
              </a>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                The provider has not attached a verified stream or replay yet.
              </p>
            )}
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
