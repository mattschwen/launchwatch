'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Rocket, Target } from 'lucide-react';
import type { Launch } from '@/lib/types';
import { formatLaunchDay, shortenLaunchSite } from '@/lib/format';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LaunchActions from './LaunchActions';

interface HeroSectionProps {
  activeLaunch: Launch | null;
  loading: boolean;
  error: string | null;
  partial: boolean;
  refresh: () => Promise<void>;
}

function launchTime(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Time TBD';
  return `${parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })} UTC`;
}

function splitSite(site: string): [string, string] {
  const [primary, ...rest] = shortenLaunchSite(site).split(',');
  return [primary.trim(), rest.join(',').trim()];
}

export default function HeroSection({
  activeLaunch,
  loading,
  error,
  partial,
  refresh,
}: HeroSectionProps): React.ReactElement {
  const [briefingOpen, setBriefingOpen] = useState(false);

  if (loading && !activeLaunch) {
    return (
      <section
        aria-label="Loading next launch"
        className="surface-card min-h-[27.5rem] p-5 sm:p-7"
      >
        <div className="skeleton mb-5 h-4 w-28 rounded" />
        <div className="skeleton mb-4 h-12 w-3/4 rounded" />
        <div className="skeleton mb-7 h-16 w-full max-w-xl rounded" />
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
          <div className="skeleton h-16 rounded" />
        </div>
      </section>
    );
  }

  if (!activeLaunch) {
    return (
      <section className="surface-card min-h-[27.5rem] p-6 sm:p-8">
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
  const [siteName, siteLocality] = splitSite(activeLaunch.launchSite);
  const vehicleDetail = [activeLaunch.rocketFamily, activeLaunch.rocketVariant]
    .filter(Boolean)
    .join(' ');
  const missionDetail = activeLaunch.orbit || activeLaunch.program || 'Target pending';

  return (
    <>
      <section
        aria-labelledby="featured-launch-title"
        className={`surface-card relative flex min-h-[27.5rem] overflow-hidden p-5 sm:p-7 lg:p-8 ${
          live ? 'border-[var(--console-red)]/40' : ''
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--console-green)]/[0.035] blur-3xl"
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="mb-4 flex min-h-5 flex-wrap items-center justify-between gap-3">
            <p className="data-label text-[var(--console-green)]">
              {live ? 'Live mission' : 'Next launch'}
            </p>
            {partial ? (
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[var(--console-amber)]">
                Partial provider data
              </span>
            ) : null}
          </div>

          <Link
            href={`/launch/${encodeURIComponent(activeLaunch.id)}`}
            className="group block w-fit max-w-full"
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
                  className="h-3 w-3 rounded-full bg-[var(--console-red)] shadow-[0_0_18px_rgba(255,107,118,0.7)]"
                />
                <p className="font-mono text-[clamp(2rem,5vw,4rem)] font-semibold tracking-[-0.04em] text-[var(--console-red)]">
                  LIVE NOW
                </p>
              </div>
            ) : (
              <Countdown targetDate={activeLaunch.date} featured />
            )}
          </div>

          <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:gap-y-0">
            <div className="relative min-w-0 pr-3 pl-7 sm:border-r sm:border-[var(--border-subtle)]">
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
            <div className="relative min-w-0 px-3 pl-10 sm:border-r sm:border-[var(--border-subtle)]">
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
            <div className="relative min-w-0 pr-3 pl-7 sm:border-r sm:border-[var(--border-subtle)] sm:px-3 sm:pl-10">
              <Rocket
                aria-hidden="true"
                className="absolute left-0 top-0.5 text-[var(--text-muted)] sm:left-3"
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
                {activeLaunch.missionType || activeLaunch.orbit || 'Launch'}
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
            className="mt-auto pt-6"
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
