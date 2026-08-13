import { Clock3 } from 'lucide-react';
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

export default function ScheduleOverlapSignal({
  overlap,
  additionalCount,
  state,
}: {
  overlap: LaunchWindowOverlap;
  additionalCount: number;
  state: 'current' | 'partial' | 'retained';
}): React.ReactElement {
  const start = new Date(overlap.start);
  const end = new Date(overlap.end);
  const sameDay = isSameUtcDay(start, end);
  const tone =
    state === 'current' ? 'var(--console-cyan)' : 'var(--console-amber)';
  const signalLabel =
    state === 'retained'
      ? 'Last-known planning signal'
      : state === 'partial'
        ? 'Partial planning signal'
        : 'Schedule planning';
  const durationLabel = formatOverlapDuration(overlap.durationMs);
  const firstMission = formatPrimaryMissionName(overlap.firstLaunch);
  const secondMission = formatPrimaryMissionName(overlap.secondLaunch);
  const startLabel = sameDay
    ? `${UTC_DATE.format(start)}, ${UTC_TIME.format(start)}`
    : `${UTC_DATE.format(start)}, ${UTC_TIME.format(start)} UTC`;
  const endLabel = sameDay
    ? `${UTC_TIME.format(end)} UTC`
    : `${UTC_DATE.format(end)}, ${UTC_TIME.format(end)} UTC`;
  const stateDescription = `${signalLabel}. ${durationLabel} overlap between ${firstMission} and ${secondMission}, ${startLabel} through ${endLabel}`;
  const additionalDescription =
    additionalCount > 0
      ? `; ${additionalCount} later overlap${additionalCount === 1 ? '' : 's'}`
      : '';

  return (
    <div
      role="status"
      aria-label={`Concurrent provider launch windows: ${stateDescription}${additionalDescription}`}
      className="grid gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/40 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"
      style={{ '--overlap-signal': tone } as React.CSSProperties}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--overlap-signal)]/25 bg-[var(--overlap-signal)]/[0.07] text-[var(--overlap-signal)]"
      >
        <Clock3 size={17} />
      </span>
      <div className="min-w-0">
        <p className="data-label text-[var(--overlap-signal)]">
          {signalLabel} <span aria-hidden="true">{'//'}</span> concurrent windows
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
        <time dateTime={overlap.start}>
          {startLabel}
        </time>
        <span aria-hidden="true">–</span>
        <time dateTime={overlap.end}>{endLabel}</time>
        {additionalCount > 0 ? (
          <span className="mt-0.5 block text-[var(--overlap-signal)]">
            +{additionalCount} later overlap{additionalCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </p>
    </div>
  );
}
