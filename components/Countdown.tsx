'use client';

import { useCountdown } from '@/lib/hooks';

interface CountdownProps {
  targetDate: string;
  className?: string;
  compact?: boolean;
  completedLabel?: string;
  featured?: boolean;
}

export default function Countdown({
  targetDate,
  className = '',
  compact = false,
  completedLabel = 'Window open',
  featured = false,
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
      <span
        suppressHydrationWarning
        className={`block font-medium leading-none tracking-[-0.055em] tabular-nums text-[var(--console-green)] ${
          featured
            ? 'text-[clamp(1.85rem,3.6vw,3.25rem)]'
            : 'text-[clamp(2.1rem,5vw,4.25rem)]'
        }`}
      >
        T− {values.join(':')}
      </span>
      <span
        aria-hidden="true"
        className={`mt-2 grid grid-cols-4 font-medium uppercase tracking-[0.14em] text-[var(--text-muted)] ${
          featured
            ? 'max-w-[28rem] pl-[2.1rem] text-[0.64rem]'
            : 'max-w-[32rem] pl-[2.4rem] text-[0.7rem]'
        }`}
      >
        <span>days</span>
        <span>hrs</span>
        <span>min</span>
        <span>sec</span>
      </span>
    </time>
  );
}
