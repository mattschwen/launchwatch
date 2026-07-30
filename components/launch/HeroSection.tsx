'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Rocket, Target } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  firstLaunchValue,
  formatLaunchDay,
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
  visualLoading?: boolean;
  visualError?: string | null;
  refresh: () => Promise<void>;
}

function launchTime(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Time TBD';
  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
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
        aria-label="Loading next launch"
        className="surface-card holo-card signal-cold min-h-[27.5rem] p-5 sm:p-7"
      >
        <div className="skeleton mb-5 h-4 w-28 rounded" />
        <div className="skeleton mb-4 h-12 w-3/4 rounded" />
        <div className="skeleton mb-7 h-16 w-full max-w-xl rounded" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
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
              <Countdown targetDate={activeLaunch.date} featured />
            )}
          </div>

          <dl className="grid grid-cols-2 gap-y-5 xl:grid-cols-4 xl:gap-y-0">
            <div className="relative min-w-0 border-r border-[var(--border-subtle)] pr-3 pl-7">
              <CalendarDays
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)]"
                size={18}
              />
              <dt className="data-label">Date (UTC)</dt>
              <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                {formatLaunchDay(activeLaunch.date)}
              </dd>
              <dd className="mt-0.5 font-mono text-xs text-[var(--console-cyan)]">
                {launchTime(activeLaunch.date)}
              </dd>
            </div>
            <div className="relative min-w-0 px-3 pl-10 xl:border-r xl:border-[var(--border-subtle)]">
              <MapPin
                aria-hidden="true"
                className="absolute left-3 top-0.5 text-[var(--text-muted)]"
                size={18}
              />
              <dt className="data-label">Site</dt>
              <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                {siteName}
              </dd>
              <dd className="mt-0.5 truncate text-xs text-[var(--console-cyan)]">
                {siteLocality || activeLaunch.location?.name || 'Location pending'}
              </dd>
            </div>
            <div className="relative min-w-0 border-r border-[var(--border-subtle)] pr-3 pl-7 xl:px-3 xl:pl-10">
              <Rocket
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)] xl:left-3"
                size={18}
              />
              <dt className="data-label">Vehicle</dt>
              <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                {activeLaunch.rocket}
              </dd>
              <dd className="mt-0.5 truncate text-xs text-[var(--console-cyan)]">
                {vehicleDetail || activeLaunch.provider || 'Vehicle profile'}
              </dd>
            </div>
            <div className="relative min-w-0 px-3 pl-10">
              <Target
                aria-hidden="true"
                className="absolute left-3 top-0.5 text-[var(--text-muted)]"
                size={18}
              />
              <dt className="data-label">Mission</dt>
              <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                {missionType}
              </dd>
              <dd className="mt-0.5 truncate text-xs text-[var(--console-cyan)]">
                {missionDetail}
              </dd>
            </div>
          </dl>

          <LaunchActions
            launch={activeLaunch}
            onOpenBriefing={() => setBriefingOpen(true)}
            showCalendar={false}
            featured
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
