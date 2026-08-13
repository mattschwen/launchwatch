import { TimerReset } from 'lucide-react';

const MAX_PAD_TURNAROUND_SECONDS = 100 * 366 * 24 * 60 * 60;

export function formatPadTurnaround(seconds: number): string | null {
  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    seconds > MAX_PAD_TURNAROUND_SECONDS
  ) {
    return null;
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    days === 0 && minutes > 0 ? `${minutes}m` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(' ') || '<1m';
}

export default function PadTurnaroundSignal({
  seconds,
  compact = false,
}: {
  seconds: number | null | undefined;
  compact?: boolean;
}): React.ReactElement | null {
  const duration = typeof seconds === 'number'
    ? formatPadTurnaround(seconds)
    : null;
  if (!duration) return null;

  return (
    <div
      data-pad-turnaround-signal
      className={compact ? 'mission-telemetry-item relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <TimerReset
          aria-hidden="true"
          size={18}
          className={`${compact ? 'absolute left-0 top-0.5' : ''} shrink-0 text-[var(--console-cyan)]`}
        />
        <span className="data-label">Pad turnaround</span>
      </dt>
      <dd
        className={`${compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'} min-w-0 text-sm text-[var(--text-primary)]`}
      >
        <span className="block font-medium">{duration}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          Since the previous launch from this pad
        </span>
      </dd>
    </div>
  );
}
