'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  MapPin,
  Rocket,
  X,
} from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  formatLaunchDate,
  formatPrimaryMissionName,
  formatLaunchWindow,
  formatTimelineOffset,
  getLaunchSiteDisplay,
  hasCalendarReadyLaunchTime,
  hasExactLaunchTime,
} from '@/lib/format';
import AddToCalendar from './AddToCalendar';
import LocalLaunchTime from './LocalLaunchTime';
import MissionDescription from './MissionDescription';
import TimelineEventClock from './TimelineEventClock';
import StatusBadge from './ui/StatusBadge';
import FirstStageSignal from './launch/FirstStageSignal';
import LaunchReadinessSignal from './launch/LaunchReadinessSignal';
import MissionProfileSignal from './launch/MissionProfileSignal';
import MissionOperatorSignal from './launch/MissionOperatorSignal';

interface LaunchBriefingDrawerProps {
  launch: Launch | null;
  open: boolean;
  onClose: () => void;
  detailHref?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const INITIAL_TIMELINE_EVENTS = 8;

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
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(
    null
  );
  const closeDrawer = useCallback((): void => {
    setExpandedTimelineId(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    onCloseRef.current = closeDrawer;
  }, [closeDrawer]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const backgroundElements = [
      ...document.body.querySelectorAll<HTMLElement>(
        ':scope > :not([data-launch-briefing-dialog])'
      ),
    ].filter(
      (element) => !['LINK', 'SCRIPT', 'STYLE'].includes(element.tagName)
    );
    const backgroundState = backgroundElements.map((element) => ({
      element,
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    }));

    backgroundElements.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });
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
      backgroundState.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open]);

  if (!open || !launch || typeof document === 'undefined') return null;

  const launchWindow = formatLaunchWindow(launch);

  return createPortal(
    <div
      data-launch-briefing-dialog
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeDrawer();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mission-briefing-dialog absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-[var(--border-strong)] bg-[var(--surface-base)] shadow-[var(--shadow-elevated)]"
      >
        <header className="mission-briefing-header flex items-start gap-4 border-b border-[var(--border-subtle)] pb-4 pl-[max(1.25rem,var(--safe-area-left))] pr-[max(1.25rem,var(--safe-area-right))] pt-[calc(1rem+var(--safe-area-top))] sm:pl-6 sm:pr-[max(1.5rem,var(--safe-area-right))]">
          <div className="min-w-0 flex-1">
            <p className="data-label">Mission briefing</p>
            <h2
              id={titleId}
              className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] text-[var(--text-primary)] sm:text-3xl"
            >
              {formatPrimaryMissionName(launch)}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Close mission briefing"
            className="mission-briefing-close icon-button shrink-0"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div
          tabIndex={0}
          aria-label="Mission briefing details"
          className="flex-1 overflow-y-auto py-5 pl-[max(1.25rem,var(--safe-area-left))] pr-[max(1.25rem,var(--safe-area-right))] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] sm:py-6 sm:pl-6 sm:pr-[max(1.5rem,var(--safe-area-right))]"
        >
          <StatusBadge status={launch.status} statusName={launch.statusName} />

          {launch.description ? (
            <MissionDescription
              description={launch.description}
              className="mt-5 text-sm leading-7 text-[var(--text-secondary)] sm:text-base"
            />
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
                <span className="block">
                  {formatLaunchDate(launch.date, launch.datePrecision)}
                </span>
                <LocalLaunchTime
                  date={launch.date}
                  precision={launch.datePrecision}
                  className="mt-1 font-mono text-xs text-[var(--text-secondary)]"
                />
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
            <LaunchReadinessSignal launch={launch} />
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
            <FirstStageSignal firstStage={launch.firstStage} />
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
                {getLaunchSiteDisplay(launch).label}
              </dd>
            </div>
            <MissionProfileSignal launch={launch} />
            <MissionOperatorSignal missionAgencies={launch.missionAgencies} />
          </dl>

          {launch.timeline?.length ? (
            <section aria-labelledby={`${titleId}-timeline`} className="mt-7">
              <h3
                id={`${titleId}-timeline`}
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                Launch timeline
              </h3>
              <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {hasCalendarReadyLaunchTime(launch.datePrecision)
                  ? `Mission clock // derived from ${
                      hasExactLaunchTime(launch.datePrecision)
                        ? 'provider T-0'
                        : 'estimated provider T-0'
                    }`
                  : 'Event clock pending a minute-level provider target'}
              </p>
              <ol
                id={`${titleId}-timeline-events`}
                className="mission-briefing-timeline mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]"
              >
                {(expandedTimelineId === launch.id
                  ? launch.timeline
                  : launch.timeline.slice(0, INITIAL_TIMELINE_EVENTS)
                ).map((event) => (
                  <li
                    key={`${event.relativeTime}-${event.type}`}
                    className="mission-briefing-event grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap font-mono text-xs text-[var(--console-cyan)]">
                        {formatTimelineOffset(event.relativeTime)}
                      </span>
                      <TimelineEventClock
                        launchDate={launch.date}
                        precision={launch.datePrecision}
                        relativeTime={event.relativeTime}
                        className="mt-1.5"
                      />
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
              {launch.timeline.length > INITIAL_TIMELINE_EVENTS ? (
                <button
                  type="button"
                  aria-expanded={expandedTimelineId === launch.id}
                  aria-controls={`${titleId}-timeline-events`}
                  aria-label={
                    expandedTimelineId === launch.id
                      ? `Show first ${INITIAL_TIMELINE_EVENTS} timeline events`
                      : `Show all ${launch.timeline.length} timeline events`
                  }
                  onClick={() =>
                    setExpandedTimelineId((current) =>
                      current === launch.id ? null : launch.id
                    )
                  }
                  className="flex min-h-11 w-full items-center justify-center gap-2 border-x border-b border-[var(--border-subtle)] px-4 py-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                >
                  {expandedTimelineId === launch.id
                    ? `Show first ${INITIAL_TIMELINE_EVENTS} events`
                    : `Reveal ${
                        launch.timeline.length - INITIAL_TIMELINE_EVENTS
                      } more events`}
                  <ChevronDown
                    aria-hidden="true"
                    size={15}
                    className={`transition-transform ${
                      expandedTimelineId === launch.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              ) : null}
            </section>
          ) : null}
        </div>

        <footer className="relative z-10 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]/65 pb-[calc(1rem+var(--safe-area-bottom))] pl-[max(1.25rem,var(--safe-area-left))] pr-[max(1.25rem,var(--safe-area-right))] pt-4 sm:pl-6 sm:pr-[max(1.5rem,var(--safe-area-right))]">
          <Link
            href={detailHref ?? `/launch/${encodeURIComponent(launch.id)}`}
            onClick={closeDrawer}
            className="action-button action-button-primary"
          >
            View full mission
          </Link>
          {launch.livestream ? (
            <Link
              href={`/watch?id=${encodeURIComponent(launch.id)}`}
              onClick={closeDrawer}
              className="action-button action-button-secondary"
            >
              Watch mission
            </Link>
          ) : null}
          {launch.status === 'upcoming' || launch.status === 'tbd' ? (
            <AddToCalendar
              key={`calendar-${launch.id}`}
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
    </div>,
    document.body
  );
}
