import { ListOrdered } from 'lucide-react';
import type { Launch } from '@/lib/types';

type LaunchCadence = Pick<
  Launch,
  | 'date'
  | 'orbitalLaunchAttemptCountYear'
  | 'providerLaunchAttemptCountYear'
  | 'padLaunchAttemptCountYear'
>;

type LaunchCadenceVariant = 'default' | 'compact' | 'hero';

function validCount(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

export default function LaunchCadenceSignal({
  launch,
  variant = 'default',
}: {
  launch: LaunchCadence;
  variant?: LaunchCadenceVariant;
}): React.ReactElement | null {
  const year = new Date(launch.date).getUTCFullYear();
  const entries = [
    {
      label: 'Provider attempt',
      count: validCount(launch.providerLaunchAttemptCountYear),
      spokenLabel: 'Launch provider attempt',
    },
    {
      label: 'Pad attempt',
      count: validCount(launch.padLaunchAttemptCountYear),
      spokenLabel: 'Launch pad attempt',
    },
    {
      label: 'Worldwide orbital',
      count: validCount(launch.orbitalLaunchAttemptCountYear),
      spokenLabel: 'Worldwide orbital launch attempt',
    },
  ].filter(
    (entry): entry is typeof entry & { count: number } => entry.count !== null,
  );

  if (!Number.isInteger(year) || entries.length === 0) return null;

  const hero = variant === 'hero';
  const compact = variant === 'compact';

  return (
    <div
      data-launch-cadence-signal
      className={
        hero
          ? 'contents sm:relative sm:col-span-full sm:block sm:min-w-0 sm:border-t sm:border-[var(--border-subtle)] sm:pt-3 sm:pl-7'
          : compact
            ? 'mission-telemetry-item relative pl-8'
            : 'py-4'
      }
    >
      <dt
        className={hero ? 'hidden items-center gap-3 sm:flex' : 'flex items-center gap-3'}
      >
        <ListOrdered
          aria-hidden="true"
          size={18}
          className={
            hero
              ? 'absolute left-0 top-3.5 shrink-0 text-[var(--console-cyan)]'
              : compact
                ? 'absolute left-0 top-0.5 shrink-0 text-[var(--console-cyan)]'
              : 'shrink-0 text-[var(--console-cyan)]'
          }
        />
        <span className="data-label">Launch cadence · {year}</span>
      </dt>
      <dd
        className={
          hero
            ? 'mt-2 hidden min-w-0 flex-wrap gap-1.5 sm:flex'
            : `${compact ? 'mt-2' : 'mt-2 pl-[1.875rem]'} flex min-w-0 flex-wrap gap-1.5`
        }
      >
        {entries.map((entry) => (
          <span
            key={entry.label}
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-accent)] px-2 py-1 font-mono text-[0.68rem] leading-4 text-[var(--text-secondary)]"
          >
            <span aria-hidden="true">
              {entry.label} <strong className="font-semibold text-[var(--console-cyan)]">#{entry.count}</strong>
            </span>
            <span className="sr-only">
              {entry.spokenLabel} number {entry.count} in {year}
            </span>
          </span>
        ))}
      </dd>
    </div>
  );
}
