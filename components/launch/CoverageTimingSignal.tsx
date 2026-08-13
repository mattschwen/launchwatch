import { RadioTower } from 'lucide-react';
import LocalLaunchTime from '@/components/LocalLaunchTime';
import {
  formatLaunchTarget,
  hasCalendarReadyLaunchTime,
} from '@/lib/format';
import type { Launch } from '@/lib/types';

const MAX_RELATIVE_OFFSET_MS = 7 * 24 * 60 * 60 * 1_000;

function formatOffsetDuration(milliseconds: number): string {
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.slice(0, 2).join(' ');
}

export function getCoverageTiming(
  launch: Pick<
    Launch,
    'date' | 'datePrecision' | 'isLive' | 'livestream' | 'livestreams' | 'status'
  >,
): { startTime: string; offsetLabel: string | null } | null {
  if (
    launch.isLive ||
    launch.status === 'success' ||
    launch.status === 'failure' ||
    !launch.livestream
  ) {
    return null;
  }

  const primaryStream = launch.livestreams?.find(
    (stream) => stream.url === launch.livestream,
  );
  const startTimestamp =
    typeof primaryStream?.startTime === 'string'
      ? Date.parse(primaryStream.startTime)
      : Number.NaN;
  if (!Number.isFinite(startTimestamp)) return null;

  const startTime = new Date(startTimestamp).toISOString();
  if (!hasCalendarReadyLaunchTime(launch.datePrecision)) {
    return { startTime, offsetLabel: null };
  }

  const launchTimestamp = Date.parse(launch.date);
  const offset = launchTimestamp - startTimestamp;
  if (
    !Number.isFinite(launchTimestamp) ||
    Math.abs(offset) > MAX_RELATIVE_OFFSET_MS
  ) {
    return { startTime, offsetLabel: null };
  }

  if (Math.abs(offset) < 30_000) {
    return { startTime, offsetLabel: 'At the provider launch target' };
  }

  return {
    startTime,
    offsetLabel: `${formatOffsetDuration(Math.abs(offset))} ${
      offset > 0 ? 'before' : 'after'
    } provider launch target`,
  };
}

export default function CoverageTimingSignal({
  launch,
  className = '',
}: {
  launch: Pick<
    Launch,
    'date' | 'datePrecision' | 'isLive' | 'livestream' | 'livestreams' | 'status'
  >;
  className?: string;
}): React.ReactElement | null {
  const timing = getCoverageTiming(launch);
  if (!timing) return null;

  return (
    <div
      role="group"
      aria-label="Provider coverage schedule"
      data-coverage-timing="scheduled"
      className={`flex min-w-0 items-start gap-3 bg-[var(--surface-cold)] px-4 py-3 text-left sm:px-5 ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--console-cyan)]/30 bg-[var(--surface-canvas)] text-[var(--console-cyan)]">
        <RadioTower aria-hidden="true" size={19} />
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="data-label text-[var(--console-cyan)]">
            Provider coverage start
          </p>
          {timing.offsetLabel ? (
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.07em] text-[var(--text-muted)]">
              {timing.offsetLabel}
            </p>
          ) : null}
        </div>
        <p className="mt-1 break-words font-mono text-sm font-medium text-[var(--text-primary)]">
          <time dateTime={timing.startTime}>
            {formatLaunchTarget(timing.startTime)}
          </time>
        </p>
        <LocalLaunchTime
          date={timing.startTime}
          className="mt-0.5 font-mono text-xs leading-5 text-[var(--text-secondary)]"
        />
      </div>
    </div>
  );
}
