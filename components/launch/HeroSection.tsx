'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Rocket, Target } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  firstLaunchValue,
  formatLaunchDay,
  formatLaunchTime,
  isCriticalLaunchStatusName,
  shortenLaunchSite,
} from '@/lib/format';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LaunchActions from './LaunchActions';
import MissionVisual from './MissionVisual';

interface HeroSectionProps {
  activeLaunch: Launch | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  partial: boolean;
  coverageLoading?: boolean;
  coverageUnavailable?: boolean;
  visualLoading?: boolean;
  visualError?: string | null;
  refresh: () => Promise<void>;
}

function splitSite(site: string): [string, string] {
  const [primary, ...rest] = shortenLaunchSite(site).split(',');
  return [primary.trim(), rest.join(',').trim()];
}

export default function HeroSection({
  activeLaunch,
  loading,
  refreshing,
  error,
  partial,
  coverageLoading = false,
  coverageUnavailable = false,
  visualLoading = false,
  visualError = null,
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

    retryFocusPendingRef.current = false;
    const frame = window.requestAnimationFrame(() =>
      missionLinkRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [activeLaunch, refreshing]);

  const retrySchedule = (): void => {
    if (refreshing) return;
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
          aria-disabled={refreshing}
          aria-busy={refreshing}
          className="action-button action-button-secondary mt-6 aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {refreshing ? 'Retrying schedule' : 'Retry schedule'}
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
            aria-disabled={refreshing}
            aria-busy={refreshing}
            className="action-button action-button-secondary mt-6 aria-disabled:cursor-wait aria-disabled:opacity-60"
          >
            {refreshing ? 'Refreshing mission queue' : 'Refresh mission queue'}
          </button>
        </div>
      </section>
    );
  }

  const live = activeLaunch.isLive;
  const critical =
    activeLaunch.status === 'failure' ||
    isCriticalLaunchStatusName(activeLaunch.statusName);
  const [siteName, siteLocality] = splitSite(activeLaunch.launchSite);
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

  return (
    <>
      <section
        aria-labelledby="featured-launch-title"
        className={`surface-card holo-card ${
          live
            ? 'signal-live'
            : critical
              ? 'signal-critical'
              : partial
                ? 'signal-warm'
                : 'signal-nominal'
        } relative flex min-h-[27.5rem] overflow-hidden p-5 sm:p-7 lg:p-8`}
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
                  : 'text-[var(--console-green)]'
              }`}
            >
              {live ? 'Live mission' : 'Next launch'}
            </p>
            {partial ? (
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[var(--console-amber)]">
                Partial provider data
              </span>
            ) : null}
          </div>

          <Link
            ref={missionLinkRef}
            href={`/launch/${encodeURIComponent(activeLaunch.id)}`}
            className="group inline-flex min-h-11 w-fit max-w-full items-center"
          >
            <h1
              id="featured-launch-title"
              className="max-w-3xl text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]"
            >
              {activeLaunch.name}
            </h1>
          </Link>

          <div className="my-5 border-b border-[var(--border-subtle)] pb-5 pt-1">
            {live ? (
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="status-dot-live h-3 w-3 rounded-full bg-[var(--console-magenta)] text-[var(--console-magenta)]"
                />
                <p className="font-mono text-[clamp(2rem,5vw,4rem)] font-semibold tracking-[-0.04em] text-[var(--console-magenta)]">
                  LIVE NOW
                </p>
              </div>
            ) : (
              <Countdown
                targetDate={activeLaunch.date}
                precision={activeLaunch.datePrecision}
                featured
              />
            )}
          </div>

          <dl className="grid grid-cols-2 gap-y-5">
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
            </div>
            <div className="relative min-w-0 pl-6 min-[360px]:px-3 min-[360px]:pl-10">
              <MapPin
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)] min-[360px]:left-3"
                size={18}
              />
              <dt className="data-label">Site</dt>
              <dd className="mt-1 break-words text-[0.8125rem] font-medium leading-5 text-[var(--text-primary)] min-[360px]:text-sm">
                {siteName}
              </dd>
              <dd className="mt-0.5 break-words text-xs leading-4 text-[var(--console-cyan)]">
                {siteLocality || activeLaunch.location?.name || 'Location pending'}
              </dd>
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
            <div className="relative min-w-0 pl-6 min-[360px]:px-3 min-[360px]:pl-10">
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
            className="mt-6"
          />

          <div className="mt-5 max-w-md">
            <MissionVisual
              launch={activeLaunch}
              priority
              compact
              loading={visualLoading}
              error={visualError}
              showUnavailableState
            />
          </div>
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
