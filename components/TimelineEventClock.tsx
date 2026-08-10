'use client';

import { useSyncExternalStore } from 'react';
import type { LaunchDatePrecision } from '@/lib/types';
import {
  formatLocalLaunchTime,
  formatTimelineEventUtcTime,
  getTimelineEventDate,
  hasExactLaunchTime,
} from '@/lib/format';

const subscribe = (): (() => void) => () => undefined;

export default function TimelineEventClock({
  launchDate,
  precision,
  relativeTime,
  className = '',
}: {
  launchDate: string;
  precision?: LaunchDatePrecision | null;
  relativeTime: string;
  className?: string;
}): React.ReactElement | null {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const eventDate = getTimelineEventDate(launchDate, relativeTime, precision);
  const utcTime = formatTimelineEventUtcTime(
    launchDate,
    relativeTime,
    precision
  );
  if (!eventDate || !utcTime) return null;

  let localTime: string | null = null;
  if (hydrated) {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      localTime = formatLocalLaunchTime(
        eventDate.toISOString(),
        precision,
        timeZone
      );
    } catch {
      localTime = null;
    }
  }

  const estimated = !hasExactLaunchTime(precision);

  return (
    <div
      data-timeline-clock
      className={`timeline-event-clock min-w-0 font-mono ${className}`}
    >
      <time
        dateTime={eventDate.toISOString()}
        className="block text-[0.68rem] font-semibold text-[var(--console-amber)]"
      >
        {estimated ? (
          <>
            <span aria-hidden="true">≈</span>
            <span className="sr-only">Estimated event time </span>
          </>
        ) : null}
        {utcTime}
      </time>
      {localTime ? (
        <span className="mt-0.5 block text-[0.62rem] leading-4 text-[var(--text-muted)]">
          <span className="font-sans font-medium uppercase tracking-[0.06em]">
            Your time
          </span>{' '}
          {localTime}
        </span>
      ) : null}
    </div>
  );
}
