import { UsersRound } from 'lucide-react';
import { isMeaningfulLaunchValue } from '@/lib/format';
import type { LaunchMissionAgency } from '@/lib/types';

function sameValue(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: 'base' }) === 0;
}

function validAgencies(
  missionAgencies: LaunchMissionAgency[] | null | undefined,
): LaunchMissionAgency[] {
  const names = new Set<string>();

  return (missionAgencies ?? []).flatMap((agency) => {
    if (!isMeaningfulLaunchValue(agency?.name)) return [];

    const name = agency.name.trim();
    const key = name.toLocaleLowerCase();
    if (names.has(key)) return [];
    names.add(key);

    return [{
      name,
      abbrev: isMeaningfulLaunchValue(agency.abbrev)
        ? agency.abbrev.trim()
        : null,
      type: isMeaningfulLaunchValue(agency.type)
        ? agency.type.trim()
        : null,
    }];
  });
}

export default function MissionOperatorSignal({
  missionAgencies,
  compact = false,
}: {
  missionAgencies: LaunchMissionAgency[] | null | undefined;
  compact?: boolean;
}): React.ReactElement | null {
  const agencies = validAgencies(missionAgencies);
  if (agencies.length === 0) return null;

  return (
    <div
      data-mission-operator-signal
      className={compact ? 'mission-telemetry-item relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <UsersRound
          aria-hidden="true"
          size={18}
          className={`${
            compact ? 'absolute left-0 top-0.5' : ''
          } shrink-0 text-[var(--console-cyan)]`}
        />
        <span className="data-label">
          {agencies.length === 1 ? 'Mission operator' : 'Mission operators'}
        </span>
      </dt>
      <dd className={`${compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'} min-w-0`}>
        <ul className="space-y-1.5">
          {agencies.map((agency) => {
            const abbreviation =
              agency.abbrev && !sameValue(agency.abbrev, agency.name)
                ? ` (${agency.abbrev})`
                : '';

            return (
              <li key={agency.name} className="min-w-0">
                <span className="block break-words text-sm font-medium text-[var(--text-primary)]">
                  {agency.name}{abbreviation}
                </span>
                {agency.type ? (
                  <span className="block break-words text-xs leading-5 text-[var(--text-muted)]">
                    {agency.type}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </dd>
    </div>
  );
}
