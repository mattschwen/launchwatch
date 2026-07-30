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

  const units = [
    { label: 'days', value: values[0] },
    { label: 'hrs', value: values[1] },
    { label: 'min', value: values[2] },
    { label: 'sec', value: values[3] },
  ];

  return (
    <time
      dateTime={targetDate}
      className={`block font-mono ${className}`}
      suppressHydrationWarning
    >
      <span className="sr-only" suppressHydrationWarning>
        {days} days, {hours} hours, {minutes} minutes, {seconds} seconds until
        launch
      </span>
      <span
        aria-hidden="true"
        suppressHydrationWarning
        className={`countdown-display grid w-full grid-cols-[auto_minmax(3ch,1.2fr)_repeat(3,minmax(2ch,1fr))] items-stretch gap-1 font-medium leading-none tabular-nums sm:gap-2 ${
          featured
            ? 'max-w-[30rem] text-[clamp(1.6rem,3.6vw,3.25rem)]'
            : 'max-w-[36rem] text-[clamp(1.7rem,5vw,4.25rem)]'
        }`}
      >
        <span className="countdown-prefix flex items-center pr-1 text-[0.68em] tracking-[-0.04em] text-[var(--console-green)] sm:pr-2">
          T−
        </span>
        {units.map((unit) => (
          <span
            key={unit.label}
            className="countdown-unit relative grid min-w-0 content-center overflow-hidden rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-green)_22%,transparent)] bg-[linear-gradient(180deg,rgba(94,230,168,0.075),rgba(7,11,18,0.72))] px-1.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:px-2 sm:py-2.5"
          >
            <span
              className="countdown-digits block text-center tracking-[-0.055em] text-[var(--console-green)] [text-shadow:0_0_18px_rgba(94,230,168,0.2)]"
              suppressHydrationWarning
            >
              {unit.value}
            </span>
            <span className="countdown-unit-label mt-1 block text-center text-[0.32em] font-semibold uppercase leading-none tracking-[0.14em] text-[var(--text-muted)]">
              {unit.label}
            </span>
          </span>
        ))}
      </span>
    </time>
  );
}
