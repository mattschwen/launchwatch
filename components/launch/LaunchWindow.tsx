import { CalendarRange } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  formatLaunchWindowDuration,
  formatLaunchWindowTimes,
} from '@/lib/format';
import LocalLaunchWindow from '@/components/LocalLaunchWindow';

export default function LaunchWindow({
  launch,
  className = '',
}: {
  launch: Pick<
    Launch,
    'date' | 'windowStart' | 'windowEnd' | 'location'
  >;
  className?: string;
}): React.ReactElement | null {
  const launchWindow = formatLaunchWindowTimes(launch);
  const launchWindowDuration = formatLaunchWindowDuration(launch);
  if (!launchWindow || !launchWindowDuration) return null;

  return (
    <div
      data-launch-window="true"
      className={`inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-cyan)_22%,transparent)] bg-[var(--console-cyan)]/[0.045] px-2.5 py-1 font-mono text-[0.68rem] leading-4 ${className}`}
    >
      <span
        role="note"
        aria-label={`Launch window ${launchWindow}, ${launchWindowDuration} duration`}
        className="inline-flex min-w-0 flex-wrap items-center gap-x-1 sm:gap-x-2"
      >
        <CalendarRange
          aria-hidden="true"
          size={14}
          className="shrink-0 text-[var(--console-cyan)]"
        />
        <span className="font-semibold uppercase tracking-[0.08em] text-[var(--console-cyan)]">
          Launch window
        </span>
        <span className="break-words text-[var(--text-secondary)]">
          {launchWindow}
        </span>
        <span
          aria-hidden="true"
          className="hidden text-[var(--border-strong)] sm:inline"
        >
          {'//'}
        </span>
        <span className="whitespace-nowrap text-[var(--text-muted)]">
          {launchWindowDuration}
          <span className="hidden sm:inline"> duration</span>
        </span>
      </span>
      <LocalLaunchWindow launch={launch} />
    </div>
  );
}
