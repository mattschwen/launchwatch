'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Orbit,
  Radio,
  Rocket,
} from 'lucide-react';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import MissionDescription from '@/components/MissionDescription';
import MissionTrajectory from '@/components/MissionTrajectory';
import LaunchActions from '@/components/launch/LaunchActions';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import MissionVisual from '@/components/launch/MissionVisual';
import StatusBadge from '@/components/ui/StatusBadge';
import VideoPlayer from '@/components/video/VideoPlayer';
import {
  firstLaunchValue,
  formatLaunchDate,
  formatTimelineOffset,
  isCriticalLaunchStatusName,
  isCompletedLaunch,
  shortenLaunchSite,
} from '@/lib/format';
import { useLaunchIntel } from '@/lib/hooks';
import type { Launch } from '@/lib/types';
import { extractYouTubeId } from '@/lib/youtube';

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
  scheduleReturnHref = null,
}: {
  launch: Launch;
  returnToWatch?: boolean;
  historyReturnHref?: string | null;
  scheduleReturnHref?: string | null;
}): React.ReactElement {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [timelineScroll, setTimelineScroll] = useState({
    canMoveBackward: false,
    canMoveForward: false,
  });
  const timelineRef = useRef<HTMLOListElement>(null);
  const intelligenceHostRef = useRef<HTMLDivElement>(null);
  const [intelligenceEnabledLaunchId, setIntelligenceEnabledLaunchId] =
    useState<string | null>(null);
  const intelligenceEnabled = intelligenceEnabledLaunchId === launch.id;
  const {
    intel,
    loading: intelLoading,
    error: intelError,
    retryAt: intelRetryAt,
    retry: retryIntel,
  } = useLaunchIntel(launch, intelligenceEnabled);

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

  const completed = isCompletedLaunch(launch);
  const hasPlayableVideo = Boolean(
    launch.livestream && extractYouTubeId(launch.livestream)
  );
  const missionTone = launch.isLive
    ? 'signal-live'
    : launch.status === 'failure' ||
        isCriticalLaunchStatusName(launch.statusName)
      ? 'signal-critical'
      : launch.status === 'tbd'
        ? 'signal-warm'
        : completed
          ? 'signal-nominal'
          : 'signal-cold';
  const returnHref = returnToWatch
    ? `/watch?id=${encodeURIComponent(launch.id)}`
    : historyReturnHref ?? scheduleReturnHref ?? (completed ? '/history' : '/');
  const returnLabel = returnToWatch
    ? 'Back to watch room'
    : historyReturnHref
      ? 'Back to filtered archive'
      : scheduleReturnHref
        ? 'Back to filtered schedule'
        : completed
          ? 'Back to history'
          : 'Back to launches';
  const missionVisual = (
    <MissionVisual
      launch={launch}
      priority
      showUnavailableState
    />
  );
  const missionTelemetry = (
    <section
      aria-label="Mission telemetry"
      className="surface-card holo-card signal-cold rounded-[var(--radius-md)] p-5"
    >
      {!completed && !launch.isLive ? (
        <div className="border-b border-[var(--border-subtle)] pb-5">
          <p className="data-label">T-minus</p>
          <Countdown
            targetDate={launch.date}
            precision={launch.datePrecision}
            className="mt-3 lg:[&>.countdown-display]:!text-[clamp(1.8rem,3.1vw,3rem)]"
          />
        </div>
      ) : launch.isLive ? (
        <div className="border-b border-[var(--border-subtle)] pb-5">
          <p className="data-label">Mission state</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[var(--console-magenta)]">
            LIVE NOW
          </p>
        </div>
      ) : null}

      <dl className={`${!completed || launch.isLive ? 'mt-5' : ''} space-y-4`}>
        <div className="relative pl-8">
          <MapPin
            aria-hidden="true"
            size={18}
            className="absolute left-0 top-0.5 text-[var(--text-muted)]"
          />
          <dt className="data-label">Launch site</dt>
          <dd className="mt-1 text-sm text-[var(--text-primary)]">
            {shortenLaunchSite(launch.launchSite)}
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
            {launch.rocket}
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
            {firstLaunchValue([launch.orbit, launch.missionType])}
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
    setTimelineScroll((current) =>
      current.canMoveBackward === canMoveBackward &&
      current.canMoveForward === canMoveForward
        ? current
        : { canMoveBackward, canMoveForward }
    );
  }, []);

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

        <section
          className={`surface-card holo-card ${missionTone} grid min-w-0 gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)] lg:gap-10`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={launch.status}
                statusName={launch.statusName}
              />
              {launch.provider ? (
                <span className="text-sm text-[var(--text-muted)]">
                  {launch.provider}
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 max-w-5xl break-words text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[0.98] tracking-[-0.06em] text-[var(--text-primary)]">
              {launch.name}
            </h1>

            <p className="mt-5 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <CalendarDays
                aria-hidden="true"
                size={17}
                className="text-[var(--console-amber)]"
              />
              {formatLaunchDate(launch.date, launch.datePrecision)}
            </p>

            {launch.description ? (
              <MissionDescription
                description={launch.description}
                className="mt-5 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base sm:leading-7"
              />
            ) : (
              <p className="mt-5 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7">
                Mission description pending from the provider.
              </p>
            )}

            <LaunchActions
              launch={launch}
              onOpenBriefing={() => setBriefingOpen(true)}
              showCalendar={!completed}
              showShare
              detail
              className="mt-6"
            />
          </div>

          <div className="min-w-0 space-y-4">
            {completed ? missionVisual : missionTelemetry}
            {completed ? missionTelemetry : missionVisual}
          </div>
        </section>

        <MissionTrajectory
          launch={launch}
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
                <span className="data-label mr-1">
                  {launch.timeline.length} events
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
                    aria-disabled={!timelineScroll.canMoveBackward}
                    onClick={() => moveTimeline(-1)}
                    className="icon-button h-11 w-11 aria-disabled:cursor-default aria-disabled:opacity-35"
                  >
                    <ChevronLeft aria-hidden="true" size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next timeline event"
                    aria-controls="launch-timeline-events"
                    aria-disabled={!timelineScroll.canMoveForward}
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
              aria-describedby="launch-timeline-instructions"
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
                launch={launch}
                intel={intel}
                loading={intelLoading}
                error={intelError}
                retryAt={intelRetryAt}
                onRetry={retryIntel}
              />
            ) : (
              <IntelligenceStandby launchName={launch.name} />
            )}
          </div>

          <section
            aria-labelledby="watch-replay-title"
            className={`surface-card holo-card ${
              launch.livestream ? 'signal-live' : 'signal-warm'
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
                launch.livestream
                  ? 'video-signal-frame border-[var(--console-magenta)]'
                  : 'border-[var(--border-subtle)]'
              }`}
            >
              <VideoPlayer
                url={launch.livestream}
                title={launch.name}
                autoplay={launch.isLive}
                className="rounded-none"
              />
            </div>
            {launch.livestream ? (
              <a
                href={launch.livestream}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--console-magenta)] hover:underline"
              >
                {hasPlayableVideo
                  ? 'Open official provider video'
                  : 'Open provider coverage'}
                <ExternalLink aria-hidden="true" size={15} />
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
        launch={launch}
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
      />
    </>
  );
}
