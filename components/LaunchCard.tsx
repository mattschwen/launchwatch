import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { Ref } from 'react';
import type { Launch } from '@/lib/types';
import LocalLaunchTime from '@/components/LocalLaunchTime';
import {
  formatLaunchDay,
  formatLaunchTime,
  getPendingLaunchStatus,
  getLaunchSiteDisplay,
  getLaunchLiveSignal,
  isCriticalLaunchStatusName,
  launchOutcomeLabel,
} from '@/lib/format';

interface LaunchCardProps {
  launch: Launch;
  variant?: 'upcoming' | 'history' | 'compact';
  showCalendar?: boolean;
  detailHref?: string;
  coverageUnconfirmed?: boolean;
  linkRef?: Ref<HTMLAnchorElement>;
  prefetch?: boolean;
}

export default function LaunchCard({
  launch,
  variant = 'upcoming',
  detailHref,
  coverageUnconfirmed = false,
  linkRef,
  prefetch,
}: LaunchCardProps): React.ReactElement {
  const history = variant === 'history';
  const liveUnconfirmed = !history && launch.isLive && coverageUnconfirmed;
  const liveSignal = getLaunchLiveSignal(launch);
  const site = getLaunchSiteDisplay(launch);
  const pendingStatus = getPendingLaunchStatus(launch.statusName);
  const critical =
    launch.status === 'failure' ||
    isCriticalLaunchStatusName(launch.statusName);
  const statusLabel = history
    ? launchOutcomeLabel(launch)
    : critical
      ? launch.statusName?.trim() || 'Launch alert'
      : liveUnconfirmed
      ? 'Coverage unconfirmed'
      : launch.isLive
        ? liveSignal === 'mission'
          ? 'In flight'
          : 'Coverage live'
        : launch.status === 'tbd'
          ? pendingStatus.label
          : launch.statusName || 'Go for launch';
  const statusClass =
    critical
      ? 'text-[var(--console-red)]'
      : liveUnconfirmed
        ? 'text-[var(--console-amber)]'
        : launch.isLive
          ? 'text-[var(--console-magenta)]'
          : launch.status === 'tbd'
            ? 'text-[var(--console-amber)]'
            : 'text-[var(--console-green)]';
  const statusDotClass =
    critical
      ? 'bg-[var(--console-red)]'
      : liveUnconfirmed
        ? 'bg-[var(--console-amber)]'
        : launch.isLive
          ? 'status-dot-live bg-[var(--console-magenta)]'
          : launch.status === 'tbd'
            ? 'bg-[var(--console-amber)]'
            : 'bg-[var(--console-green)]';
  const launchTime = formatLaunchTime(launch.date, launch.datePrecision);

  return (
    <article className="group border-b border-[var(--border-subtle)] last:border-b-0">
      <Link
        ref={linkRef}
        href={detailHref ?? `/launch/${encodeURIComponent(launch.id)}`}
        prefetch={prefetch}
        className="launch-card-grid focus-ring-inset grid min-h-[4rem] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--surface-subtle)] sm:px-4"
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
            {!history ? (
              <LocalLaunchTime
                date={launch.date}
                precision={launch.datePrecision}
                className="mt-1 font-mono text-[0.68rem] leading-4 text-[var(--text-secondary)]"
              />
            ) : null}
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
            {site.primary}
          </p>
          {site.context ? (
            <p className="mt-0.5 break-words text-xs leading-4 text-[var(--console-cyan)]">
              {site.context}
            </p>
          ) : null}
        </div>

        <div
          data-launch-status="true"
          className="flex min-w-0 items-center justify-between gap-3"
        >
          <span
            aria-label={
              !history &&
              !liveUnconfirmed &&
              !launch.isLive &&
              launch.status === 'tbd'
                ? pendingStatus.name
                : undefined
            }
            className={`flex min-w-0 items-center gap-2 font-mono text-xs font-medium ${statusClass}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`}
            />
            <span className="min-w-0 flex-1 break-words whitespace-normal leading-4">
              {statusLabel}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            size={18}
            className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--console-cyan)]"
          />
        </div>

        <dl className="col-span-full grid min-w-0 grid-cols-2 gap-4 border-t border-[var(--border-subtle)] pt-2.5 lg:hidden">
          <div className="min-w-0">
            <dt className="data-label">Vehicle</dt>
            <dd className="mt-1 break-words text-xs leading-4 text-[var(--text-secondary)]">
              {launch.rocket}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="data-label">Site</dt>
            <dd className="mt-1 break-words text-xs leading-4 text-[var(--console-cyan)]">
              {site.label}
            </dd>
          </div>
        </dl>
      </Link>
    </article>
  );
}
