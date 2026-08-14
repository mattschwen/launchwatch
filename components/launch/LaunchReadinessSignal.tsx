import { Gauge } from 'lucide-react';
import { isMeaningfulLaunchValue } from '@/lib/format';
import type { Launch } from '@/lib/types';

type LaunchReadiness = Pick<
  Launch,
  'launchProbability' | 'weatherConcerns' | 'holdReason'
>;
type LaunchReadinessVariant = 'default' | 'compact' | 'hero';

function normalizedValue(value: string | null | undefined): string | null {
  return isMeaningfulLaunchValue(value) ? value.trim() : null;
}

export default function LaunchReadinessSignal({
  launch,
  variant = 'default',
}: {
  launch: LaunchReadiness;
  variant?: LaunchReadinessVariant;
}): React.ReactElement | null {
  const probability =
    typeof launch.launchProbability === 'number' &&
    Number.isInteger(launch.launchProbability) &&
    launch.launchProbability >= 0 &&
    launch.launchProbability <= 100
      ? launch.launchProbability
      : null;
  const weatherConcerns = normalizedValue(launch.weatherConcerns);
  const holdReason = normalizedValue(launch.holdReason);

  if (probability === null && !weatherConcerns && !holdReason) return null;

  const primary =
    probability !== null
      ? `${probability}% provider probability`
      : holdReason
        ? 'Provider hold reported'
        : 'Provider constraint reported';
  const context = [
    holdReason ? `Hold · ${holdReason}` : null,
    weatherConcerns ? `Weather · ${weatherConcerns}` : null,
  ].filter((value): value is string => Boolean(value));
  const cautionSummary = holdReason && weatherConcerns
    ? 'hold + weather'
    : holdReason
      ? 'hold'
      : weatherConcerns
        ? 'weather'
        : null;
  const caution = Boolean(holdReason || weatherConcerns);
  const hero = variant === 'hero';
  const compact = variant === 'compact';
  const signalColor = caution
    ? 'text-[var(--console-amber)]'
    : 'text-[var(--console-cyan)]';

  if (hero) {
    return (
      <div
        role="note"
        aria-label={`Launch readiness: ${primary}${
          context.length ? `. ${context.join('. ')}` : ''
        }`}
        data-launch-readiness-signal
        className={`launch-readiness-hero inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 py-0.5 font-mono text-[0.64rem] uppercase tracking-[0.07em] ${
          caution
            ? 'border-[color-mix(in_srgb,var(--console-amber)_32%,transparent)] bg-[color-mix(in_srgb,var(--console-amber)_7%,transparent)]'
            : 'border-[color-mix(in_srgb,var(--console-cyan)_26%,transparent)] bg-[color-mix(in_srgb,var(--console-cyan)_6%,transparent)]'
        }`}
      >
        <Gauge
          aria-hidden="true"
          size={14}
          className={`shrink-0 ${signalColor}`}
        />
        <span className="min-w-0">
          <span className={`block whitespace-nowrap font-semibold ${signalColor}`}>
            {probability !== null ? (
              <>
                {probability}%{' '}
                <span className="sr-only">provider probability</span>
                {cautionSummary ? (
                  <span aria-hidden="true"> · {cautionSummary}</span>
                ) : (
                  <span aria-hidden="true"> probability</span>
                )}
              </>
            ) : (
              cautionSummary ? `${cautionSummary} reported` : primary
            )}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      data-launch-readiness-signal
      className={compact ? 'mission-telemetry-item relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <Gauge
          aria-hidden="true"
          size={18}
          className={`${
            compact ? 'absolute left-0 top-0.5' : ''
          } shrink-0 ${signalColor}`}
        />
        <span className="data-label">Launch readiness</span>
      </dt>
      <dd
        className={`${compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'} min-w-0 text-sm text-[var(--text-primary)]`}
      >
        <span className="block break-words font-medium">{primary}</span>
        {context.length > 0 ? (
          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
            {context.map((value) => (
              <span key={value} className="block break-words">
                {value}
              </span>
            ))}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
