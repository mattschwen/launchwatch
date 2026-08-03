import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  formatLaunchDay,
  formatLaunchTime,
  isCriticalLaunchStatusName,
  launchOutcomeLabel,
  shortenLaunchSite,
} from '@/lib/format';

interface LaunchCardProps {
  launch: Launch;
  variant?: 'upcoming' | 'history' | 'compact';
  showCalendar?: boolean;
  detailHref?: string;
}

export default function LaunchCard({
  launch,
  variant = 'upcoming',
  detailHref,
}: LaunchCardProps): React.ReactElement {
  const history = variant === 'history';
  const [siteName, ...siteLocality] = shortenLaunchSite(
    launch.launchSite,
  ).split(',');
  const statusLabel = history
    ? launchOutcomeLabel(launch)
    : launch.isLive
      ? 'Live now'
      : launch.status === 'tbd'
        ? 'TBC'
        : launch.statusName || 'Go for launch';
  const critical =
    launch.status === 'failure' ||
    isCriticalLaunchStatusName(launch.statusName);
  const statusClass =
    critical
      ? 'text-[var(--console-red)]'
      : launch.isLive
        ? 'text-[var(--console-magenta)]'
        : launch.status === 'tbd'
          ? 'text-[var(--console-amber)]'
          : 'text-[var(--console-green)]';
  const statusDotClass =
    critical
      ? 'bg-[var(--console-red)]'
      : launch.isLive
        ? 'status-dot-live bg-[var(--console-magenta)]'
        : launch.status === 'tbd'
          ? 'bg-[var(--console-amber)]'
          : 'bg-[var(--console-green)]';
  const launchTime = formatLaunchTime(launch.date, launch.datePrecision);

  return (
    <article className="group border-b border-[var(--border-subtle)] last:border-b-0">
      <Link
        href={detailHref ?? `/launch/${encodeURIComponent(launch.id)}`}
        className="focus-ring-inset grid min-h-[4rem] grid-cols-[minmax(7.25rem,.7fr)_minmax(0,1.3fr)] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--surface-subtle)] sm:px-4 lg:grid-cols-[minmax(9.5rem,.8fr)_minmax(12rem,1.45fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.62fr)]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <CalendarDays
            aria-hidden="true"
            size={17}
            className="shrink-0 text-[var(--text-muted)]"
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-medium leading-5 text-[var(--text-primary)]">
              {formatLaunchDay(launch.date, launch.datePrecision)}
            </p>
            <p
              aria-label={launchTime}
              className="mt-0.5 font-mono text-xs text-[var(--console-cyan)]"
            >
              {launchTime}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold leading-5 tracking-[-0.015em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
            {launch.name}
          </h3>
          <p className="mt-0.5 break-words text-sm leading-5 text-[var(--text-muted)]">
            {launch.provider || 'Launch provider'}
          </p>
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="break-words text-sm leading-5 text-[var(--text-primary)]">
            {launch.rocket}
          </p>
          <p className="mt-0.5 break-words text-xs leading-4 text-[var(--text-muted)]">
            {launch.rocketFamily || launch.missionType || 'Launch vehicle'}
          </p>
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="break-words text-sm font-medium leading-5 text-[var(--text-primary)]">
            {siteName.trim()}
          </p>
          <p className="mt-0.5 break-words text-xs leading-4 text-[var(--console-cyan)]">
            {siteLocality.join(',').trim() ||
              launch.location?.name ||
              'Location pending'}
          </p>
        </div>

        <div className="col-start-2 flex min-w-0 items-center justify-between gap-3 lg:col-start-auto">
          <span
            className={`flex min-w-0 items-center gap-2 font-mono text-xs font-medium ${statusClass}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`}
            />
            <span className="truncate">{statusLabel}</span>
          </span>
          <ChevronRight
            aria-hidden="true"
            size={18}
            className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--console-cyan)]"
          />
        </div>

        <dl className="col-span-2 grid min-w-0 grid-cols-2 gap-4 border-t border-[var(--border-subtle)] pt-2.5 lg:hidden">
          <div className="min-w-0">
            <dt className="data-label">Vehicle</dt>
            <dd className="mt-1 break-words text-xs leading-4 text-[var(--text-secondary)]">
              {launch.rocket}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="data-label">Site</dt>
            <dd className="mt-1 break-words text-xs leading-4 text-[var(--console-cyan)]">
              {shortenLaunchSite(launch.launchSite)}
            </dd>
          </div>
        </dl>
      </Link>
    </article>
  );
}
