'use client';

import { useCountdown } from '@/lib/hooks';

interface CountdownProps {
  targetDate: string;
  className?: string;
  compact?: boolean;
  completedLabel?: string;
}

export default function Countdown({
  targetDate,
  className = '',
  compact = false,
  completedLabel = 'Window open',
}: CountdownProps): React.ReactElement {
  const { days, hours, minutes, seconds, total } = useCountdown(targetDate);

  if (total <= 0) {
    return (
      <span
        className={`font-mono text-sm font-medium text-[var(--text-secondary)] ${className}`}
      >
        {completedLabel}
      </span>
    );
  }

  const values = [days, hours, minutes, seconds].map((value) =>
    String(value).padStart(2, '0')
  );

  if (compact) {
    const compactValue =
      days > 0
        ? `T−${days}d ${String(hours).padStart(2, '0')}h`
        : `T−${values[1]}:${values[2]}:${values[3]}`;

    return (
      <time
        dateTime={targetDate}
        className={`font-mono text-sm font-semibold tabular-nums text-[var(--console-green)] ${className}`}
        suppressHydrationWarning
      >
        {compactValue}
      </time>
    );
  }

  return (
    <time
      dateTime={targetDate}
      className={`block font-mono ${className}`}
      suppressHydrationWarning
      aria-label={`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds until launch`}
    >
      <span className="block text-[clamp(2.1rem,5vw,4.25rem)] font-medium leading-none tracking-[-0.055em] tabular-nums text-[var(--console-green)]">
        T− {values.join(':')}
      </span>
      <span
        aria-hidden="true"
        className="mt-2 grid max-w-[32rem] grid-cols-4 pl-[2.4rem] text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]"
      >
        <span>days</span>
        <span>hrs</span>
        <span>min</span>
        <span>sec</span>
      </span>
    </time>
  );
}
