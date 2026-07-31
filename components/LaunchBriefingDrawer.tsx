'use client';

import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  Orbit,
  Rocket,
  X,
} from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  firstLaunchValue,
  formatLaunchDate,
  formatLaunchWindow,
  formatTimelineOffset,
  shortenLaunchSite,
} from '@/lib/format';
import AddToCalendar from './AddToCalendar';
import StatusBadge from './ui/StatusBadge';

interface LaunchBriefingDrawerProps {
  launch: Launch | null;
  open: boolean;
  onClose: () => void;
  detailHref?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function LaunchBriefingDrawer({
  launch,
  open,
  onClose,
  detailHref,
}: LaunchBriefingDrawerProps): React.ReactElement | null {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open || !launch) return null;

  const launchWindow = formatLaunchWindow(launch);

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close mission briefing"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-[var(--border-strong)] bg-[var(--surface-base)] shadow-[var(--shadow-elevated)]"
      >
        <header className="flex items-start gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="data-label">Mission briefing</p>
            <h2
              id={titleId}
              className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)] sm:text-3xl"
            >
              {launch.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close mission briefing"
            className="icon-button shrink-0"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div
          tabIndex={0}
          aria-label="Mission briefing details"
          className="flex-1 overflow-y-auto px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] sm:px-6 sm:py-6"
        >
          <StatusBadge status={launch.status} statusName={launch.statusName} />

          {launch.description ? (
            <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {launch.description}
            </p>
          ) : (
            <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
              The provider has not supplied a full mission description.
            </p>
          )}

          <dl className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            <div className="py-4">
              <dt className="flex items-center gap-3">
                <CalendarDays
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-[var(--text-muted)]"
                />
                <span className="data-label">Target time</span>
              </dt>
              <dd className="mt-1 pl-[1.875rem] text-sm text-[var(--text-primary)]">
                {formatLaunchDate(launch.date, launch.datePrecision)}
              </dd>
            </div>
            {launchWindow ? (
              <div className="py-4">
                <dt className="flex items-center gap-3">
                  <CalendarDays
                    aria-hidden="true"
                    size={18}
                    className="shrink-0 text-[var(--console-cyan)]"
                  />
                  <span className="data-label">Launch window</span>
                </dt>
                <dd className="mt-1 pl-[1.875rem] text-sm text-[var(--text-primary)]">
                  {launchWindow}
                </dd>
              </div>
            ) : null}
            <div className="py-4">
              <dt className="flex items-center gap-3">
                <Rocket
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-[var(--text-muted)]"
                />
                <span className="data-label">Vehicle</span>
              </dt>
              <dd className="mt-1 pl-[1.875rem] text-sm text-[var(--text-primary)]">
                {launch.rocket}
              </dd>
            </div>
            <div className="py-4">
              <dt className="flex items-center gap-3">
                <MapPin
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-[var(--text-muted)]"
                />
                <span className="data-label">Launch site</span>
              </dt>
              <dd className="mt-1 pl-[1.875rem] text-sm text-[var(--text-primary)]">
                {shortenLaunchSite(launch.launchSite)}
              </dd>
            </div>
            <div className="py-4">
              <dt className="flex items-center gap-3">
                <Orbit
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-[var(--text-muted)]"
                />
                <span className="data-label">Mission profile</span>
              </dt>
              <dd className="mt-1 pl-[1.875rem] text-sm text-[var(--text-primary)]">
                {firstLaunchValue([launch.orbit, launch.missionType])}
              </dd>
            </div>
          </dl>

          {launch.timeline?.length ? (
            <section aria-labelledby={`${titleId}-timeline`} className="mt-7">
              <h3
                id={`${titleId}-timeline`}
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                Launch timeline
              </h3>
              <ol className="mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                {launch.timeline.slice(0, 8).map((event) => (
                  <li
                    key={`${event.relativeTime}-${event.type}`}
                    className="grid grid-cols-[6.75rem_minmax(0,1fr)] gap-3 py-3"
                  >
                    <span className="whitespace-nowrap font-mono text-xs text-[var(--console-cyan)]">
                      {formatTimelineOffset(event.relativeTime)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--text-primary)]">
                        {event.type}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-[var(--text-muted)]">
                        {event.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]/65 px-5 py-4 sm:px-6">
          <Link
            href={detailHref ?? `/launch/${encodeURIComponent(launch.id)}`}
            onClick={onClose}
            className="action-button action-button-primary"
          >
            View full mission
          </Link>
          {launch.livestream ? (
            <Link
              href={`/watch?id=${encodeURIComponent(launch.id)}`}
              onClick={onClose}
              className="action-button action-button-secondary"
            >
              Watch mission
            </Link>
          ) : null}
          {launch.status === 'upcoming' || launch.status === 'tbd' ? (
            <AddToCalendar
              launch={launch}
              variant="icon"
              menuPlacement="top"
              menuAlign="right"
            />
          ) : null}
          {launch.livestream ? (
            <a
              href={launch.livestream}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-button"
              aria-label="Open official video in a new tab"
            >
              <ExternalLink aria-hidden="true" size={17} />
            </a>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
