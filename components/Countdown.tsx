'use client';

import { useCountdown } from '@/lib/hooks';
import {
  formatLaunchPrecisionLabel,
  formatLaunchTarget,
  getLaunchWindowBounds,
  hasCountdownTarget,
  hasExactLaunchTime,
} from '@/lib/format';
import type { LaunchDatePrecision } from '@/lib/types';

interface CountdownProps {
  targetDate: string;
  animated?: boolean;
  className?: string;
  compact?: boolean;
  completedLabel?: string;
  featured?: boolean;
  precision?: LaunchDatePrecision | null;
  windowEnd?: string | null;
  windowStart?: string | null;
}

function formatCountdownUnit(
  value: number,
  unit: 'day' | 'hour' | 'minute' | 'second',
): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

function formatSpokenCountdown({
  days,
  hours,
  minutes,
  seconds,
  estimated,
  precisionLabel,
}: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  estimated: boolean;
  precisionLabel: string;
}): string {
  const duration = [
    formatCountdownUnit(days, 'day'),
    formatCountdownUnit(hours, 'hour'),
    formatCountdownUnit(minutes, 'minute'),
    formatCountdownUnit(seconds, 'second'),
  ].join(', ');

  return estimated
    ? `Estimated countdown: ${duration} until the provider target. ${precisionLabel}.`
    : `${duration} until launch`;
}

export default function Countdown({
  targetDate,
  animated = true,
  className = '',
  compact = false,
  completedLabel,
  featured = false,
  precision = null,
  windowEnd = null,
  windowStart = null,
}: CountdownProps): React.ReactElement {
  const { days, hours, minutes, seconds, total, now } =
    useCountdown(targetDate);
  const exact = hasExactLaunchTime(precision);
  const precisionLabel = formatLaunchPrecisionLabel(precision) || 'Date estimate';
  const estimated = !exact && hasCountdownTarget(precision);
  const spokenCountdown = formatSpokenCountdown({
    days,
    hours,
    minutes,
    seconds,
    estimated,
    precisionLabel,
  });

  if (!hasCountdownTarget(precision)) {
    const target = formatLaunchTarget(targetDate, precision);

    if (compact) {
      return (
        <time
          dateTime={targetDate}
          className={`font-mono text-xs font-semibold text-[var(--console-amber)] ${className}`}
        >
          {formatLaunchTarget(targetDate, precision)} · {precisionLabel}
        </time>
      );
    }

    return (
      <time dateTime={targetDate} className={`block ${className}`}>
        <span className="countdown-spoken sr-only">
          Estimated launch target: {target}. {precisionLabel}.
        </span>
        <span
          aria-hidden="true"
          className={`block rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-amber)_30%,transparent)] bg-[color-mix(in_srgb,var(--console-amber)_6%,var(--surface-base))] px-4 py-3 ${
            featured ? 'max-w-[30rem]' : 'max-w-[36rem]'
          }`}
        >
          <span className="data-label block text-[var(--console-amber)]">
            Target estimate
          </span>
          <span className="mt-1 block break-words font-mono text-[clamp(1.4rem,4vw,2.35rem)] font-semibold leading-tight tracking-[-0.035em] text-[var(--text-primary)]">
            {target}
          </span>
          <span className="mt-1 block text-xs text-[var(--text-muted)]">
            {precisionLabel} · countdown begins when the provider confirms T-0
          </span>
        </span>
      </time>
    );
  }

  if (total <= 0) {
    const launchWindow = getLaunchWindowBounds({
      date: targetDate,
      windowStart,
      windowEnd,
    });
    const providerWindowOpen = Boolean(
      launchWindow && launchWindow.end.getTime() >= now
    );
    const statusLabel = completedLabel
      ? completedLabel
      : providerWindowOpen
        ? 'Launch window open'
        : 'Awaiting provider update';
    const statusTone = completedLabel
      ? 'text-[var(--text-secondary)]'
      : providerWindowOpen
        ? 'text-[var(--console-green)]'
        : 'text-[var(--console-amber)]';

    return (
      <span
        role="status"
        aria-label={statusLabel}
        aria-atomic="true"
        data-countdown-state={
          completedLabel
            ? 'complete'
            : providerWindowOpen
              ? 'window-open'
              : 'awaiting-provider'
        }
        className={`font-mono text-sm font-medium ${statusTone} ${className}`}
      >
        {statusLabel}
      </span>
    );
  }

  const values = [days, hours, minutes, seconds].map((value) =>
    String(value).padStart(2, '0')
  );

  if (compact) {
    const compactValue = estimated
      ? days > 0
        ? `≈T−${days}d ${values[1]}:${values[2]}:${values[3]} · ${precisionLabel}`
        : `≈T−${values[1]}:${values[2]}:${values[3]} · ${precisionLabel}`
      : days > 0
        ? `T−${days}d ${values[1]}h`
        : `T−${values[1]}:${values[2]}:${values[3]}`;

    return (
      <time
        dateTime={targetDate}
        className={`font-mono text-sm font-semibold tabular-nums ${
          estimated
            ? 'text-[var(--console-amber)]'
            : 'text-[var(--console-green)]'
        } ${className}`}
        suppressHydrationWarning
      >
        <span
          className="countdown-spoken sr-only"
          suppressHydrationWarning
        >
          {spokenCountdown}
        </span>
        <span
          key={animated && estimated ? seconds : 'steady'}
          aria-hidden="true"
          className={
            animated && estimated
              ? 'countdown-compact-tick inline-block'
              : undefined
          }
        >
          {compactValue}
        </span>
      </time>
    );
  }

  const allUnits = [
    { label: 'days', value: values[0] },
    { label: 'hrs', value: values[1] },
    { label: 'min', value: values[2] },
    { label: 'sec', value: values[3] },
  ];
  const units = allUnits;
  const gridColumns =
    'grid-cols-[auto_minmax(3ch,1.2fr)_repeat(3,minmax(2ch,1fr))]';

  return (
    <time
      dateTime={targetDate}
      className={`block font-mono ${className}`}
      suppressHydrationWarning
    >
      <span className="countdown-spoken sr-only" suppressHydrationWarning>
        {spokenCountdown}
      </span>
      <span
        aria-hidden="true"
        suppressHydrationWarning
        className={`countdown-display grid w-full ${gridColumns} items-stretch gap-1 font-medium leading-none tabular-nums sm:gap-2 ${
          featured
            ? 'max-w-[30rem] text-[clamp(1.6rem,3.6vw,3.25rem)]'
            : 'max-w-[36rem] text-[clamp(1.7rem,5vw,4.25rem)]'
        }`}
      >
        <span
          className={`countdown-prefix flex items-center pr-1 text-[0.68em] tracking-[-0.04em] sm:pr-2 ${
            estimated
              ? 'text-[var(--console-amber)]'
              : 'text-[var(--console-green)]'
          }`}
        >
          {estimated ? '≈T−' : 'T−'}
        </span>
        {units.map((unit) => (
          <span
            key={unit.label}
            className={`countdown-unit relative grid min-w-0 content-center overflow-hidden rounded-[var(--radius-sm)] border px-1.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] max-[359px]:px-1 sm:px-2 sm:py-2.5 ${
              estimated
                ? 'border-[color-mix(in_srgb,var(--console-amber)_25%,transparent)] bg-[linear-gradient(180deg,rgba(244,185,95,0.075),rgba(7,11,18,0.72))]'
                : 'border-[color-mix(in_srgb,var(--console-green)_22%,transparent)] bg-[linear-gradient(180deg,rgba(94,230,168,0.075),rgba(7,11,18,0.72))]'
            }`}
          >
            <span
              key={`${unit.label}-${unit.value}`}
              className={`countdown-digits block text-center tracking-[-0.055em] ${
                animated ? 'countdown-digit-tick' : ''
              } ${
                estimated
                  ? 'text-[var(--console-amber)] [text-shadow:0_0_18px_rgba(244,185,95,0.18)]'
                  : 'text-[var(--console-green)] [text-shadow:0_0_18px_rgba(94,230,168,0.2)]'
              }`}
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
      {estimated ? (
        <span
          aria-hidden="true"
          className="mt-2 block font-sans text-xs leading-5 text-[var(--console-amber)]"
        >
          {precisionLabel} · provider target may move
        </span>
      ) : null}
    </time>
  );
}
