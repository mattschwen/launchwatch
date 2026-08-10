'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Rocket, Target } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  firstLaunchValue,
  formatLaunchDay,
  formatPrimaryMissionName,
  formatLaunchTime,
  getLaunchSiteDisplay,
  getLaunchLiveSignal,
  isCriticalLaunchStatusName,
} from '@/lib/format';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LocalLaunchTime from '@/components/LocalLaunchTime';
import LaunchActions from './LaunchActions';
import LaunchWindow from './LaunchWindow';

interface HeroSectionProps {
  activeLaunch: Launch | null;
  detailHref?: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  offline?: boolean;
  partial: boolean;
  stale?: boolean;
  coverageLoading?: boolean;
  coverageUnavailable?: boolean;
  refresh: () => Promise<void>;
}

export default function HeroSection({
  activeLaunch,
  detailHref,
  loading,
  refreshing,
  error,
  offline = false,
  partial,
  stale = false,
  coverageLoading = false,
  coverageUnavailable = false,
  refresh,
}: HeroSectionProps): React.ReactElement {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const missionLinkRef = useRef<HTMLAnchorElement>(null);
  const retryFocusPendingRef = useRef(false);

  useEffect(() => {
    if (!retryFocusPendingRef.current || refreshing) return;

    if (!activeLaunch) {
      retryFocusPendingRef.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      retryFocusPendingRef.current = false;
      missionLinkRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeLaunch, refreshing]);

  const retryUnavailable = refreshing || offline;
  const retrySchedule = (): void => {
    if (retryUnavailable) return;
    retryFocusPendingRef.current = true;
    void refresh();
  };

  if (loading && !activeLaunch) {
    return (
      <section
        aria-labelledby="next-launch-loading-title"
        aria-busy="true"
        className="surface-card holo-card signal-cold min-h-[27.5rem] p-5 sm:p-7"
      >
        <div className="mb-5 flex min-h-5 flex-wrap items-center justify-between gap-3">
          <p className="data-label text-[var(--console-cyan)]">
            Mission sync // provider handshake
          </p>
          <span className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--console-cyan)]">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[var(--console-cyan)]"
            />
            Acquiring
          </span>
        </div>
        <h1
          id="next-launch-loading-title"
          className="max-w-2xl text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)]"
        >
          Acquiring next mission
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          Verifying launch windows and mission details across connected
          providers.
        </p>
        <div
          aria-hidden="true"
          className="mt-7 border-t border-[var(--border-subtle)] pt-5"
        >
          <div className="skeleton mb-5 h-14 w-full max-w-xl rounded" />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="skeleton h-16 rounded" />
            <div className="skeleton h-16 rounded" />
            <div className="skeleton h-16 rounded" />
            <div className="skeleton h-16 rounded" />
          </div>
        </div>
      </section>
    );
  }

  if (!activeLaunch && error) {
    return (
      <section className="surface-card holo-card signal-critical min-h-[27.5rem] p-6 sm:p-8">
        <p className="data-label text-[var(--console-red)]">Schedule unavailable</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
          We could not load the next mission.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {error}
        </p>
        <button
          type="button"
          onClick={retrySchedule}
          aria-disabled={retryUnavailable}
          aria-busy={refreshing}
          className="action-button action-button-secondary mt-6 aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {refreshing
            ? 'Retrying schedule'
            : offline
              ? 'Reconnect to retry'
              : 'Retry schedule'}
        </button>
      </section>
    );
  }

  if (!activeLaunch) {
    return (
      <section className="surface-card holo-card signal-nominal min-h-[27.5rem] overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--console-cyan)]/[0.055] blur-3xl"
        />
        <div className="relative">
          <p className="data-label text-[var(--console-green)]">
            Schedule synchronized
          </p>
          <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
            Launch queue is clear.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Connected providers returned a healthy schedule with no upcoming
            missions. Keep the feed armed for the next assignment.
          </p>
          <button
            type="button"
            onClick={retrySchedule}
            aria-disabled={retryUnavailable}
            aria-busy={refreshing}
            className="action-button action-button-secondary mt-6 aria-disabled:cursor-wait aria-disabled:opacity-60"
          >
            {refreshing
              ? 'Refreshing mission queue'
              : offline
                ? 'Reconnect to refresh'
                : 'Refresh mission queue'}
          </button>
        </div>
      </section>
    );
  }

  const retained = Boolean(error || offline);
  const retainedLive = activeLaunch.isLive && (retained || stale);
  const live = activeLaunch.isLive && !retainedLive;
  const liveSignal = getLaunchLiveSignal(activeLaunch);
  const missionInFlight = liveSignal === 'mission';
  const feedNotice = offline
    ? 'Last-known mission · device offline'
    : retained
      ? 'Last-known mission · refresh failed'
    : stale
      ? 'Last-known mission · stale cache'
      : partial
        ? 'Partial provider data'
        : null;
  const critical =
    activeLaunch.status === 'failure' ||
    isCriticalLaunchStatusName(activeLaunch.statusName);
  const criticalStatusLabel =
    activeLaunch.statusName?.trim() || 'Launch status alert';
  const site = getLaunchSiteDisplay(activeLaunch);
  const vehicleDetail = [activeLaunch.rocketFamily, activeLaunch.rocketVariant]
    .filter(Boolean)
    .join(' ');
  const missionType = firstLaunchValue(
    [activeLaunch.missionType, activeLaunch.orbit],
    'Profile pending'
  );
  const missionDetail = firstLaunchValue(
    [activeLaunch.orbit, activeLaunch.program],
    'Target pending'
  );
  const primaryMissionName = formatPrimaryMissionName(activeLaunch);

  return (
    <>
      <section
        aria-labelledby="featured-launch-title"
        className={`surface-card holo-card ${
          live
            ? 'signal-live'
            : critical
              ? 'signal-critical'
              : partial || stale || retained
                ? 'signal-warm'
                : 'signal-nominal'
        } relative flex min-h-[27.5rem] overflow-hidden p-4 min-[360px]:p-5 sm:p-7 lg:p-8`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--console-magenta)]/[0.06] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-[var(--console-cyan)]/[0.045] blur-3xl"
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="mb-4 flex min-h-5 flex-wrap items-center justify-between gap-3">
            <p
              className={`data-label ${
                live
                  ? 'text-[var(--console-magenta)]'
                  : critical
                    ? 'text-[var(--console-red)]'
                  : 'text-[var(--console-green)]'
              }`}
            >
              {retainedLive
                ? 'Last-known live coverage'
                : live
                  ? missionInFlight
                    ? 'Mission in flight'
                    : 'Coverage live'
                  : critical
                    ? 'Launch status alert'
                  : 'Next launch'}
            </p>
            {feedNotice ? (
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[var(--console-amber)]">
                {feedNotice}
              </span>
            ) : null}
          </div>

          <Link
            ref={missionLinkRef}
            href={
              detailHref ??
              `/launch/${encodeURIComponent(activeLaunch.id)}`
            }
            prefetch={false}
            className="group inline-flex min-h-11 w-fit max-w-full items-center"
          >
            <h1
              id="featured-launch-title"
              className="max-w-3xl text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]"
            >
              {primaryMissionName}
            </h1>
          </Link>

          <div className="my-5 flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 pt-1 md:max-lg:flex-row md:max-lg:items-end md:max-lg:justify-between">
            <div className="min-w-0 flex-1">
              {live && missionInFlight ? (
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="status-dot-live h-3 w-3 rounded-full bg-[var(--console-magenta)] text-[var(--console-magenta)]"
                  />
                  <p className="font-mono text-[clamp(2rem,5vw,4rem)] font-semibold tracking-[-0.04em] text-[var(--console-magenta)]">
                    IN FLIGHT
                  </p>
                </div>
              ) : live ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="status-dot-live h-2.5 w-2.5 rounded-full bg-[var(--console-magenta)]"
                    />
                    <p className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--console-magenta)]">
                      Coverage live
                    </p>
                  </div>
                  <Countdown
                    targetDate={activeLaunch.date}
                    precision={activeLaunch.datePrecision}
                    windowStart={activeLaunch.windowStart}
                    windowEnd={activeLaunch.windowEnd}
                    featured
                  />
                </div>
              ) : retainedLive ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full bg-[var(--console-amber)]"
                    />
                    <p className="font-mono text-[clamp(1.65rem,4vw,3rem)] font-semibold tracking-[-0.04em] text-[var(--console-amber)]">
                      COVERAGE UNCONFIRMED
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                    The last provider update marked coverage live, but the
                    current feed cannot confirm the broadcast or mission state.
                  </p>
                </div>
              ) : (
                <div>
                  {critical ? (
                    <p
                      role="status"
                      aria-label={`Launch status: ${criticalStatusLabel}`}
                      className="mb-3 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--console-red)]"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--console-red)]"
                      />
                      {criticalStatusLabel}
                    </p>
                  ) : null}
                  <Countdown
                    alert={critical}
                    targetDate={activeLaunch.date}
                    precision={activeLaunch.datePrecision}
                    windowStart={activeLaunch.windowStart}
                    windowEnd={activeLaunch.windowEnd}
                    featured
                  />
                </div>
              )}
            </div>
            <LaunchWindow
              launch={activeLaunch}
              className="shrink-0 self-start md:max-lg:max-w-[45%] md:max-lg:self-end"
            />
          </div>

          <dl className="compact-hero-telemetry grid gap-y-5">
            <div className="relative min-w-0 border-r border-[var(--border-subtle)] pr-3 pl-7">
              <CalendarDays
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)]"
                size={18}
              />
              <dt className="data-label">Date (UTC)</dt>
              <dd className="mt-1 break-words text-[0.8125rem] font-medium leading-5 text-[var(--text-primary)] min-[360px]:text-sm">
                {formatLaunchDay(
                  activeLaunch.date,
                  activeLaunch.datePrecision
                )}
              </dd>
              <dd className="mt-0.5 font-mono text-xs text-[var(--console-cyan)]">
                {formatLaunchTime(
                  activeLaunch.date,
                  activeLaunch.datePrecision
                )}
              </dd>
              <LocalLaunchTime
                as="dd"
                date={activeLaunch.date}
                precision={activeLaunch.datePrecision}
                className="mt-1 font-mono text-[0.7rem] leading-4 text-[var(--text-secondary)]"
              />
            </div>
            <div className="relative min-w-0 pl-6 min-[360px]:pl-10">
              <MapPin
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)] min-[360px]:left-3"
                size={18}
              />
              <dt className="data-label">Site</dt>
              <dd className="mt-1 break-words text-[0.8125rem] font-medium leading-5 text-[var(--text-primary)] min-[360px]:text-sm">
                {site.primary}
              </dd>
              {site.context ? (
                <dd className="mt-0.5 break-words text-xs leading-4 text-[var(--console-cyan)]">
                  {site.context}
                </dd>
              ) : null}
            </div>
            <div className="relative min-w-0 border-r border-[var(--border-subtle)] pr-3 pl-7">
              <Rocket
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)]"
                size={18}
              />
              <dt className="data-label">Vehicle</dt>
              <dd className="mt-1 break-words text-[0.8125rem] font-medium leading-5 text-[var(--text-primary)] min-[360px]:text-sm">
                {activeLaunch.rocket}
              </dd>
              <dd className="mt-0.5 break-words text-xs leading-4 text-[var(--console-cyan)]">
                {vehicleDetail || activeLaunch.provider || 'Vehicle profile'}
              </dd>
            </div>
            <div className="relative min-w-0 pl-6 min-[360px]:pl-10">
              <Target
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)] min-[360px]:left-3"
                size={18}
              />
              <dt className="data-label">Mission</dt>
              <dd className="mt-1 break-words text-[0.8125rem] font-medium leading-5 text-[var(--text-primary)] min-[360px]:text-sm">
                {missionType}
              </dd>
              <dd className="mt-0.5 break-words text-xs leading-4 text-[var(--console-cyan)]">
                {missionDetail}
              </dd>
            </div>
          </dl>

          <LaunchActions
            launch={activeLaunch}
            onOpenBriefing={() => setBriefingOpen(true)}
            showCalendar={false}
            featured
            coverageLoading={coverageLoading}
            coverageUnavailable={coverageUnavailable}
            className="compact-hero-actions mt-6"
          />
        </div>
      </section>

      <LaunchBriefingDrawer
        launch={activeLaunch}
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
      />
    </>
  );
}
