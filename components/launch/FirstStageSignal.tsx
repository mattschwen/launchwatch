import { Repeat2 } from 'lucide-react';
import type { LaunchFirstStage } from '@/lib/types';
import { formatLaunchDate } from '@/lib/format';
import { formatPadTurnaround } from './PadTurnaroundSignal';

function firstStageIdentity(firstStage: LaunchFirstStage): string {
  const identity = [
    firstStage.serialNumber,
    firstStage.flightNumber ? `Flight ${firstStage.flightNumber}` : null,
  ].filter((value): value is string => Boolean(value));

  return identity.join(' · ') || 'Provider-reported first stage';
}

function firstStageContext(firstStage: LaunchFirstStage): string[] {
  const context: string[] = [];

  if (firstStage.reused === true) context.push('Flight-proven booster');
  else if (firstStage.reused === false) context.push('New booster');

  const location = firstStage.landingLocation
    ? firstStage.landingLocationAbbrev &&
      firstStage.landingLocationAbbrev !== firstStage.landingLocation
      ? `${firstStage.landingLocation} (${firstStage.landingLocationAbbrev})`
      : firstStage.landingLocation
    : firstStage.landingLocationAbbrev ||
      firstStage.landingTypeAbbrev ||
      firstStage.landingType;

  if (firstStage.landingAttempt === false) {
    context.push('No recovery attempt planned');
  } else if (firstStage.landingAttempt === true) {
    const recovery =
      firstStage.landingSuccess === true
        ? 'Recovery confirmed'
        : firstStage.landingSuccess === false
          ? 'Recovery unsuccessful'
          : 'Recovery planned';
    context.push(location ? `${recovery} · ${location}` : recovery);
  }

  return context;
}

function previousFlightContext(firstStage: LaunchFirstStage): string | null {
  const previousMission = firstStage.previousFlightName;
  const previousDate = firstStage.previousFlightDate
    ? formatLaunchDate(firstStage.previousFlightDate)
    : null;
  const turnaround = firstStage.turnaroundSeconds !== null
    ? formatPadTurnaround(firstStage.turnaroundSeconds)
    : null;
  const context = [
    previousMission,
    previousDate,
    turnaround ? `${turnaround} between provider launch dates` : null,
  ].filter((value): value is string => Boolean(value));

  return context.length > 0 ? context.join(' · ') : null;
}

export default function FirstStageSignal({
  firstStage,
  compact = false,
}: {
  firstStage: LaunchFirstStage | null | undefined;
  compact?: boolean;
}): React.ReactElement | null {
  if (!firstStage) return null;

  const context = firstStageContext(firstStage);
  const previousFlight = previousFlightContext(firstStage);

  return (
    <div
      data-first-stage-signal
      className={compact ? 'relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <Repeat2
          aria-hidden="true"
          size={18}
          className={
            compact
              ? 'absolute left-0 top-0.5 shrink-0 text-[var(--console-cyan)]'
              : 'shrink-0 text-[var(--console-cyan)]'
          }
        />
        <span className="data-label">First stage</span>
      </dt>
      <dd
        className={`${compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'} text-sm text-[var(--text-primary)]`}
      >
        <span className="block font-medium">{firstStageIdentity(firstStage)}</span>
        {context.length > 0 ? (
          <span className="mt-1 block break-words text-xs leading-5 text-[var(--text-muted)]">
            {context.join(' // ')}
          </span>
        ) : null}
        {previousFlight ? (
          <span className="mt-2 block min-w-0 border-l border-[var(--console-cyan)]/40 pl-2 text-xs leading-5 text-[var(--text-muted)]">
            <span className="block font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--console-cyan)]">
              Previous flight
            </span>
            <span className="block break-words">{previousFlight}</span>
          </span>
        ) : null}
      </dd>
    </div>
  );
}
