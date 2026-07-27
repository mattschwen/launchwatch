'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Rocket, Target } from 'lucide-react';
import { useLiveLaunches, useNextLaunch } from '@/lib/hooks';
import { formatLaunchDate, shortenLaunchSite } from '@/lib/format';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import StatusBadge from '@/components/ui/StatusBadge';
import LaunchActions from './LaunchActions';

export default function HeroSection(): React.ReactElement {
  const {
    liveLaunches,
    loading: liveLoading,
    error,
    meta,
    refresh,
  } = useLiveLaunches();
  const { nextLaunch, loading: nextLoading } = useNextLaunch();
  const [briefingOpen, setBriefingOpen] = useState(false);

  const activeLaunch = liveLaunches[0] ?? nextLaunch;
  const loading = liveLoading || nextLoading;

  if (loading && !activeLaunch) {
    return (
      <section aria-label="Loading next launch" className="surface-card p-5 sm:p-7">
        <div className="skeleton mb-5 h-4 w-28 rounded" />
        <div className="skeleton mb-4 h-12 w-3/4 rounded" />
        <div className="skeleton mb-7 h-16 w-full max-w-xl rounded" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
        </div>
      </section>
    );
  }

  if (!activeLaunch) {
    return (
      <section className="surface-card p-6 sm:p-8">
        <p className="data-label text-[var(--console-amber)]">Schedule unavailable</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)]">
          We could not load the next mission.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {error || 'No upcoming launches were returned by the connected providers.'}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="action-button action-button-secondary mt-6"
        >
          Retry schedule
        </button>
      </section>
    );
  }

  const live = activeLaunch.isLive;

  return (
    <>
      <section
        aria-labelledby="featured-launch-title"
        className={`surface-card relative overflow-hidden p-5 sm:p-7 lg:p-8 ${
          live ? 'border-[var(--console-red)]/40' : ''
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--console-green)]/[0.035] blur-3xl"
        />

        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="data-label text-[var(--console-green)]">
              {live ? 'Live mission' : 'Next launch'}
            </p>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={activeLaunch.status}
                statusName={activeLaunch.statusName}
              />
              {meta?.partial ? (
                <span className="text-xs text-[var(--console-amber)]">
                  Partial provider data
                </span>
              ) : null}
            </div>
          </div>

          <Link
            href={`/launch/${encodeURIComponent(activeLaunch.id)}`}
            className="group block w-fit max-w-full"
          >
            <h1
              id="featured-launch-title"
              className="max-w-4xl text-[clamp(2.25rem,5vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.055em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]"
            >
              {activeLaunch.name}
            </h1>
          </Link>

          <p className="mt-3 text-sm font-medium text-[var(--text-secondary)] sm:text-base">
            {[activeLaunch.provider, activeLaunch.rocket]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <div className="my-7 border-y border-[var(--border-subtle)] py-6">
            {live ? (
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full bg-[var(--console-red)] shadow-[0_0_18px_rgba(255,107,118,0.7)]"
                />
                <p className="font-mono text-[clamp(2rem,5vw,4rem)] font-semibold tracking-[-0.04em] text-[var(--console-red)]">
                  LIVE NOW
                </p>
              </div>
            ) : (
              <Countdown targetDate={activeLaunch.date} />
            )}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative min-w-0 pl-8">
              <CalendarDays
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)]"
                size={19}
              />
              <dt className="data-label">Date (UTC)</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {formatLaunchDate(activeLaunch.date)}
              </dd>
            </div>
            <div className="relative min-w-0 pl-8">
              <MapPin
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)]"
                size={19}
              />
              <dt className="data-label">Site</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {shortenLaunchSite(activeLaunch.launchSite)}
              </dd>
            </div>
            <div className="relative min-w-0 pl-8">
              <Rocket
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)]"
                size={19}
              />
              <dt className="data-label">Vehicle</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {activeLaunch.rocket}
              </dd>
            </div>
            <div className="relative min-w-0 pl-8">
              <Target
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)]"
                size={19}
              />
              <dt className="data-label">Mission</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {activeLaunch.missionType || activeLaunch.orbit || 'Launch'}
              </dd>
            </div>
          </dl>

          {activeLaunch.description ? (
            <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
              {activeLaunch.description}
            </p>
          ) : null}

          <LaunchActions
            launch={activeLaunch}
            onOpenBriefing={() => setBriefingOpen(true)}
            className="mt-6"
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
