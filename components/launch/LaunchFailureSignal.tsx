import { AlertTriangle } from 'lucide-react';
import { isMeaningfulLaunchValue } from '@/lib/format';
import type { Launch } from '@/lib/types';

type LaunchFailure = Pick<Launch, 'status' | 'failureReason'>;

export default function LaunchFailureSignal({
  launch,
  compact = false,
  className = '',
}: {
  launch: LaunchFailure;
  compact?: boolean;
  className?: string;
}): React.ReactElement | null {
  const reason = isMeaningfulLaunchValue(launch.failureReason)
    ? launch.failureReason.trim()
    : null;

  if (launch.status !== 'failure' || !reason || reason.length > 500) {
    return null;
  }

  if (compact) {
    return (
      <div
        data-launch-failure-signal
        className={`mission-telemetry-item relative pl-8 ${className}`.trim()}
      >
        <AlertTriangle
          aria-hidden="true"
          size={18}
          className="absolute left-0 top-0.5 shrink-0 text-[var(--console-red)]"
        />
        <dt className="data-label text-[var(--console-red)]">
          Provider failure report
        </dt>
        <dd className="mt-1 break-words text-sm leading-6 text-[var(--text-primary)]">
          {reason}
        </dd>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label={`Provider failure report: ${reason}`}
      data-launch-failure-signal
      className={`rounded-[var(--radius-sm)] border border-[var(--console-red)]/30 bg-[var(--console-red)]/[0.055] px-4 py-3 ${className}`.trim()}
    >
      <AlertTriangle
        aria-hidden="true"
        size={18}
        className="mb-2 shrink-0 text-[var(--console-red)]"
      />
      <p className="data-label text-[var(--console-red)]">
        Provider failure report
      </p>
      <p className="mt-1 break-words text-sm leading-6 text-[var(--text-primary)]">
        {reason}
      </p>
    </div>
  );
}
