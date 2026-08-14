'use client';

import { useId, useState } from 'react';
import { ChevronDown, Clock3 } from 'lucide-react';
import { formatPrimaryMissionName } from '@/lib/format';
import type { LaunchWindowOverlap } from '@/lib/schedule-overlap';

const UTC_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const UTC_TIME = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

function formatOverlapDuration(milliseconds: number): string {
  const totalMinutes = Math.floor(milliseconds / 60_000);
  if (totalMinutes < 1) return '<1 min';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;

  const hourLabel = `${hours} hr${hours === 1 ? '' : 's'}`;
  return minutes === 0 ? hourLabel : `${hourLabel} ${minutes} min`;
}

function isSameUtcDay(first: Date, second: Date): boolean {
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate()
  );
}

function getOverlapCopy(overlap: LaunchWindowOverlap): {
  durationLabel: string;
  endLabel: string;
  firstMission: string;
  secondMission: string;
  startLabel: string;
} {
  const start = new Date(overlap.start);
  const end = new Date(overlap.end);
  const sameDay = isSameUtcDay(start, end);

  return {
    durationLabel: formatOverlapDuration(overlap.durationMs),
    firstMission: formatPrimaryMissionName(overlap.firstLaunch),
    secondMission: formatPrimaryMissionName(overlap.secondLaunch),
    startLabel: sameDay
      ? `${UTC_DATE.format(start)}, ${UTC_TIME.format(start)}`
      : `${UTC_DATE.format(start)}, ${UTC_TIME.format(start)} UTC`,
    endLabel: sameDay
      ? `${UTC_TIME.format(end)} UTC`
      : `${UTC_DATE.format(end)}, ${UTC_TIME.format(end)} UTC`,
  };
}

export default function ScheduleOverlapSignal({
  overlaps,
  state,
}: {
  overlaps: readonly LaunchWindowOverlap[];
  state: 'current' | 'partial' | 'retained';
}): React.ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  const disclosureId = useId();
  const overlap = overlaps[0];
  if (!overlap) return null;

  const tone =
    state === 'current' ? 'var(--console-cyan)' : 'var(--console-amber)';
  const signalLabel =
    state === 'retained'
      ? 'Last-known planning signal'
      : state === 'partial'
        ? 'Partial planning signal'
        : 'Schedule planning';
  const {
    durationLabel,
    endLabel,
    firstMission,
    secondMission,
    startLabel,
  } = getOverlapCopy(overlap);
  const laterOverlaps = overlaps.slice(1);
  const additionalCount = laterOverlaps.length;
  const stateDescription = `${signalLabel}. ${durationLabel} overlap between ${firstMission} and ${secondMission}, ${startLabel} through ${endLabel}`;
  const additionalDescription =
    additionalCount > 0
      ? `; ${additionalCount} later overlap${additionalCount === 1 ? '' : 's'}`
      : '';

  return (
    <section
      aria-label="Concurrent launch window planning"
      className="border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/40"
      style={{ '--overlap-signal': tone } as React.CSSProperties}
    >
      <div
        role="status"
        aria-label={`Concurrent provider launch windows: ${stateDescription}${additionalDescription}`}
        className="grid gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--overlap-signal)]/25 bg-[var(--overlap-signal)]/[0.07] text-[var(--overlap-signal)]"
        >
          <Clock3 size={17} />
        </span>
        <div className="min-w-0">
          <p className="data-label text-[var(--overlap-signal)]">
            {signalLabel}{' '}
            <span aria-hidden="true">{'//'}</span> concurrent windows
          </p>
          <p className="mt-1 break-words text-sm leading-5 text-[var(--text-secondary)]">
            <strong className="font-semibold text-[var(--text-primary)]">
              {durationLabel} overlap
            </strong>{' '}
            <span aria-hidden="true">·</span>{' '}
            {firstMission} + {secondMission}
          </p>
        </div>
        <p className="min-w-0 font-mono text-[0.7rem] leading-5 text-[var(--text-muted)] sm:text-right">
          <time dateTime={overlap.start}>{startLabel}</time>
          <span aria-hidden="true">–</span>
          <time dateTime={overlap.end}>{endLabel}</time>
        </p>
      </div>

      {additionalCount > 0 ? (
        <div className="border-t border-[var(--border-subtle)]">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={disclosureId}
            onClick={() => setExpanded((value) => !value)}
            className="group flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left font-mono text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--overlap-signal)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] sm:px-5"
          >
            <span>
              {expanded ? 'Hide' : 'Show'} {additionalCount} later overlap
              {additionalCount === 1 ? '' : 's'}
            </span>
            <ChevronDown
              aria-hidden="true"
              size={16}
              className={`shrink-0 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expanded ? (
            <ol
              id={disclosureId}
              aria-label="Later concurrent provider launch windows"
              className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]"
            >
              {laterOverlaps.map((laterOverlap, index) => {
                const copy = getOverlapCopy(laterOverlap);
                return (
                  <li
                    key={`${laterOverlap.firstLaunch.id}:${laterOverlap.secondLaunch.id}:${laterOverlap.start}`}
                    className="grid min-w-0 gap-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:px-5"
                  >
                    <span
                      aria-hidden="true"
                      className="font-mono text-[0.65rem] font-semibold text-[var(--overlap-signal)]"
                    >
                      {String(index + 2).padStart(2, '0')}
                    </span>
                    <p className="min-w-0 break-words text-sm leading-5 text-[var(--text-secondary)]">
                      <strong className="font-semibold text-[var(--text-primary)]">
                        {copy.durationLabel} overlap
                      </strong>{' '}
                      <span aria-hidden="true">·</span>{' '}
                      {copy.firstMission} + {copy.secondMission}
                    </p>
                    <p className="min-w-0 font-mono text-[0.68rem] leading-5 text-[var(--text-muted)] sm:text-right">
                      <time dateTime={laterOverlap.start}>
                        {copy.startLabel}
                      </time>
                      <span aria-hidden="true">–</span>
                      <time dateTime={laterOverlap.end}>{copy.endLabel}</time>
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
