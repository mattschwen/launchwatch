import { Orbit } from 'lucide-react';
import { isMeaningfulLaunchValue } from '@/lib/format';
import type { Launch } from '@/lib/types';

type MissionProfile = Pick<
  Launch,
  'missionType' | 'orbit' | 'program' | 'programs'
>;
type MissionProfileVariant = 'default' | 'compact' | 'hero';

function normalizedValue(value: string | null | undefined): string | null {
  return isMeaningfulLaunchValue(value) ? value.trim() : null;
}

function sameValue(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: 'base' }) === 0;
}

function normalizedPrograms(launch: MissionProfile): string[] {
  return [...(launch.programs ?? []), launch.program]
    .reduce<string[]>((programs, value) => {
      const program = normalizedValue(value);
      if (
        program &&
        !programs.some((candidate) => sameValue(candidate, program))
      ) {
        programs.push(program);
      }
      return programs;
    }, []);
}

export default function MissionProfileSignal({
  launch,
  variant = 'default',
}: {
  launch: MissionProfile;
  variant?: MissionProfileVariant;
}): React.ReactElement {
  const missionType = normalizedValue(launch.missionType);
  const programs = normalizedPrograms(launch);
  const orbit = normalizedValue(launch.orbit);
  const primary = missionType || programs[0] || orbit || 'Profile pending';
  const contextualPrograms = programs.filter(
    (program) => !sameValue(program, primary),
  );
  const programContext = contextualPrograms.length > 0
    ? `${contextualPrograms.length === 1 ? 'Program' : 'Programs'} · ${contextualPrograms.join(' · ')}`
    : null;
  const context = [
    programContext,
    orbit && !sameValue(orbit, primary) ? `Orbit · ${orbit}` : null,
  ].filter((value): value is string => Boolean(value));
  const heroContext =
    contextualPrograms.length > 0
      ? {
          label: contextualPrograms.length === 1 ? 'Program' : 'Programs',
          value: contextualPrograms.join(' · '),
        }
      : orbit && !sameValue(orbit, primary)
        ? { label: 'Orbit', value: orbit }
        : null;
  const compact = variant === 'compact';
  const hero = variant === 'hero';

  return (
    <div
      data-mission-profile-signal
      className={
        hero
          ? 'relative min-w-0 pl-6 min-[360px]:pl-10'
          : compact
            ? 'mission-telemetry-item relative pl-8'
            : 'py-4'
      }
    >
      <dt className="flex items-center gap-3">
        <Orbit
          aria-hidden="true"
          size={18}
          className={
            hero
              ? 'absolute left-0 top-0.5 shrink-0 text-[var(--console-cyan)] min-[360px]:left-3'
              : compact
                ? 'absolute left-0 top-0.5 shrink-0 text-[var(--console-cyan)]'
                : 'shrink-0 text-[var(--console-cyan)]'
          }
        />
        <span className="data-label">{hero ? 'Mission' : 'Mission profile'}</span>
      </dt>
      <dd
        className={`${compact || hero ? 'mt-1' : 'mt-1 pl-[1.875rem]'} min-w-0 text-[0.8125rem] font-medium leading-5 text-[var(--text-primary)] min-[360px]:text-sm`}
      >
        <span className="block break-words">{primary}</span>
        {hero && heroContext ? (
          <span
            aria-label={`${heroContext.label}: ${heroContext.value}`}
            className="mt-0.5 block break-words text-[0.68rem] font-normal leading-4 text-[var(--console-cyan)]"
          >
            {heroContext.value}
          </span>
        ) : !hero && context.length > 0 ? (
          <span className="mt-0.5 block text-xs font-normal leading-5 text-[var(--console-cyan)]">
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
