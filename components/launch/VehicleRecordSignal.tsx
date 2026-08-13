import { History } from 'lucide-react';
import type { LaunchVehicleRecord } from '@/lib/types';

function formatMaidenFlight(value: string | null): string | null {
  if (!value) return null;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default function VehicleRecordSignal({
  record,
  compact = false,
}: {
  record: LaunchVehicleRecord | null | undefined;
  compact?: boolean;
}): React.ReactElement | null {
  if (!record) return null;

  const maidenFlight = formatMaidenFlight(record.maidenFlight);
  const summary = record.totalLaunchCount === 0
    ? 'No completed flights recorded'
    : `${record.totalLaunchCount.toLocaleString('en-US')} provider-recorded flight${
        record.totalLaunchCount === 1 ? '' : 's'
      }`;

  return (
    <div
      data-vehicle-record-signal
      className={compact ? 'mission-telemetry-item relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <History
          aria-hidden="true"
          size={18}
          className={
            compact
              ? 'absolute left-0 top-0.5 shrink-0 text-[var(--console-cyan)]'
              : 'shrink-0 text-[var(--console-cyan)]'
          }
        />
        <span className="data-label">Vehicle record</span>
      </dt>
      <dd className={`${compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'} min-w-0`}>
        <span className="block text-sm font-medium text-[var(--text-primary)]">
          {summary}
        </span>
        {record.totalLaunchCount > 0 ? (
          <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
            <span className="rounded-[var(--radius-sm)] border border-[var(--console-green)]/20 bg-[var(--console-green)]/[0.06] px-2 py-1 font-mono text-[0.68rem] leading-4 text-[var(--console-green)]">
              {record.successfulLaunches.toLocaleString('en-US')} successful
            </span>
            <span className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-accent)] px-2 py-1 font-mono text-[0.68rem] leading-4 text-[var(--console-amber)]">
              {record.failedLaunches.toLocaleString('en-US')} failed
            </span>
          </span>
        ) : null}
        <span className="mt-1.5 block break-words text-xs leading-5 text-[var(--text-muted)]">
          {maidenFlight ? `Configuration first flew ${maidenFlight}. ` : ''}
          Historical provider record — not a forecast for this mission.
        </span>
      </dd>
    </div>
  );
}
