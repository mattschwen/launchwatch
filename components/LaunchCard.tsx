import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  formatLaunchDay,
  launchOutcomeLabel,
  shortenLaunchSite,
} from '@/lib/format';

interface LaunchCardProps {
  launch: Launch;
  variant?: 'upcoming' | 'history' | 'compact';
  showCalendar?: boolean;
}

export default function LaunchCard({
  launch,
  variant = 'upcoming',
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
        ? launch.statusName || 'To be confirmed'
        : launch.statusName || 'Go for launch';
  const statusClass =
    launch.status === 'failure'
      ? 'text-[var(--console-red)]'
      : launch.status === 'tbd'
        ? 'text-[var(--console-amber)]'
        : launch.isLive
          ? 'text-[var(--console-red)]'
          : 'text-[var(--console-green)]';
  const statusDotClass =
    launch.status === 'failure'
      ? 'bg-[var(--console-red)]'
      : launch.status === 'tbd'
        ? 'bg-[var(--console-amber)]'
        : launch.isLive
          ? 'bg-[var(--console-red)]'
          : 'bg-[var(--console-green)]';

  return (
    <article className="group border-b border-[var(--border-subtle)] last:border-b-0">
      <Link
        href={`/launch/${encodeURIComponent(launch.id)}`}
        className="grid min-h-[4rem] grid-cols-[minmax(7.25rem,.7fr)_minmax(0,1.3fr)] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--surface-subtle)] sm:px-4 lg:grid-cols-[minmax(9.5rem,.8fr)_minmax(12rem,1.45fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.62fr)]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <CalendarDays
            aria-hidden="true"
            size={17}
            className="shrink-0 text-[var(--text-muted)]"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {formatLaunchDay(launch.date)}
            </p>
            <p className="mt-0.5 font-mono text-xs text-[var(--console-cyan)]">
              {new Date(launch.date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC',
              })}{' '}
              UTC
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-[-0.015em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
            {launch.name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
            {launch.provider || 'Launch provider'}
          </p>
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm text-[var(--text-primary)]">
            {launch.rocket}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
            {launch.rocketFamily || launch.missionType || 'Launch vehicle'}
          </p>
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {siteName.trim()}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--console-cyan)]">
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
      </Link>
    </article>
  );
}
