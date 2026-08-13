'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Globe2 } from 'lucide-react';
import HeroSection from '@/components/launch/HeroSection';
import MissionVisualDisclosure from '@/components/launch/MissionVisualDisclosure';
import LaunchList from '@/components/LaunchList';
import TrajectoryErrorBoundary from '@/components/trajectory/TrajectoryErrorBoundary';
import {
  DEFAULT_FILTERS,
  type FilterOptions,
} from '@/components/FilterBar';
import { useLaunchById, useLaunches } from '@/lib/hooks';
import { selectLaunchVisual } from '@/lib/launch-visual';
import {
  buildScheduleDetailHref,
  parseScheduleFilters,
  readScheduleReturnFocus,
} from '@/lib/schedule-return';

const MissionTrajectory = dynamic(
  () => import('@/components/MissionTrajectory'),
  {
    ssr: false,
    loading: () => <TrajectoryLoadingState />,
  },
);

const DESKTOP_MAP_QUERY = '(min-width: 64rem)';

function TrajectoryLoadingState(): React.ReactElement {
  return (
    <div
      aria-label="Loading mission trajectory"
      aria-busy="true"
      className="surface-card holo-card signal-cold flex min-h-[27.5rem] flex-col overflow-hidden"
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <p className="data-label text-[var(--console-cyan)]">
          Trajectory standby
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Awaiting mission coordinates
        </p>
      </div>
      <div aria-hidden="true" className="grid flex-1 place-items-center p-5">
        <div className="w-full max-w-sm">
          <div className="skeleton mx-auto h-16 w-16 rounded-full" />
          <div className="skeleton mx-auto mt-5 h-3 w-40 rounded" />
          <div className="skeleton mx-auto mt-3 h-3 w-56 max-w-full rounded" />
        </div>
      </div>
    </div>
  );
}

function TrajectoryUnavailableState({
  scheduleError,
}: {
  scheduleError: boolean;
}): React.ReactElement {
  return (
    <div
      role="status"
      aria-label="Mission trajectory unavailable"
      className="surface-card holo-card signal-warm flex min-h-[27.5rem] flex-col overflow-hidden"
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <p className="data-label text-[var(--console-amber)]">
          Mission path unavailable
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {scheduleError
            ? 'Launch schedule could not be loaded'
            : 'No scheduled mission to model'}
        </p>
      </div>
      <div className="grid flex-1 place-items-center p-5 text-center">
        <div className="max-w-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--console-amber)]">
            <Globe2 aria-hidden="true" size={25} />
          </span>
          <p className="mt-5 font-semibold text-[var(--text-primary)]">
            Trajectory console on standby
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {scheduleError
              ? 'Mission mapping will return when the launch schedule reconnects.'
              : 'A trajectory will appear when providers schedule the next mission.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeWithReturnContext(): React.ReactElement {
  const searchParams = useSearchParams();
  const initialFilters = parseScheduleFilters(searchParams);
  const returnFocusId = readScheduleReturnFocus(searchParams);

  return (
    <HomeExperience
      initialFilters={initialFilters}
      returnFocusId={returnFocusId}
    />
  );
}

function HomeExperience({
  initialFilters,
  returnFocusId = null,
}: {
  initialFilters: FilterOptions;
  returnFocusId?: string | null;
}): React.ReactElement {
  const { launches, online, loading, refreshing, error, meta, refresh } = useLaunches();
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [desktopMapEnabled, setDesktopMapEnabled] = useState(false);
  const [scheduleFilters, setScheduleFilters] = useState(initialFilters);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_MAP_QUERY);
    const update = (): void => setDesktopMapEnabled(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const featuredLaunch =
    launches.find((launch) => launch.isLive) ??
    launches.find(
      (launch) => launch.status === 'upcoming' || launch.status === 'tbd',
    ) ??
    null;
  const featuredVisual = selectLaunchVisual(featuredLaunch);
  const needsVisualEnrichment = featuredVisual.status !== 'available';
  const needsCoverageEnrichment = Boolean(
    featuredLaunch && !featuredLaunch.livestream,
  );
  const needsVehicleRecordEnrichment = Boolean(
    featuredLaunch && !featuredLaunch.vehicleRecord,
  );
  const featuredDetail = useLaunchById(
    needsVisualEnrichment ||
      needsCoverageEnrichment ||
      needsVehicleRecordEnrichment
      ? featuredLaunch?.id
      : null,
  );
  const featuredMission = featuredDetail.launch ?? featuredLaunch;
  const missionPathTitle = featuredMission
    ? 'Illustrative mission path'
    : loading
      ? 'Mission path pending'
      : 'Mission path unavailable';
  const missionPathDetail = featuredMission
    ? 'Launch site and modeled mission phases'
    : loading
      ? 'Waiting for the launch schedule'
      : error
        ? 'Launch schedule could not be loaded'
        : 'No scheduled mission to model';

  return (
    <div className="page-container py-4 sm:py-5 lg:py-6">
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <HeroSection
          activeLaunch={featuredMission}
          detailHref={
            featuredMission
              ? buildScheduleDetailHref(featuredMission.id, scheduleFilters)
              : undefined
          }
          loading={loading}
          refreshing={refreshing}
          error={error}
          offline={!online}
          partial={Boolean(meta?.partial)}
          stale={Boolean(meta?.stale)}
          coverageLoading={
            needsCoverageEnrichment && featuredDetail.enriching
          }
          coverageUnavailable={
            needsCoverageEnrichment &&
            Boolean(featuredDetail.error || featuredDetail.notFound)
          }
          refresh={refresh}
        />
        <aside aria-label="Mission trajectory" className="hidden min-w-0 lg:block">
          {loading && !featuredMission ? (
            <TrajectoryLoadingState />
          ) : !featuredMission ? (
            <TrajectoryUnavailableState scheduleError={Boolean(error)} />
          ) : desktopMapEnabled ? (
            <TrajectoryErrorBoundary
              resetKey={featuredMission.id}
              className="min-h-[27.5rem]"
            >
              <MissionTrajectory launch={featuredMission} />
            </TrajectoryErrorBoundary>
          ) : (
            <TrajectoryLoadingState />
          )}
        </aside>
      </div>

      <div className="mt-4">
        <LaunchList
          initialFilters={initialFilters}
          onFiltersChange={setScheduleFilters}
          returnFocusId={returnFocusId}
        />
      </div>

      <section className="mt-4 lg:hidden">
        <button
          type="button"
          aria-expanded={featuredMission ? mobileMapOpen : undefined}
          aria-controls={featuredMission ? 'mobile-mission-map' : undefined}
          aria-disabled={featuredMission ? undefined : true}
          onClick={() => {
            if (featuredMission) setMobileMapOpen((value) => !value);
          }}
          className={`surface-card flex min-h-[4.5rem] w-full items-center gap-3 px-4 text-left transition-colors ${
            featuredMission
              ? 'hover:border-[var(--border-accent)] hover:bg-[var(--surface-subtle)]'
              : loading
                ? 'cursor-wait'
                : 'cursor-default'
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] ${
              featuredMission
                ? 'text-[var(--console-green)]'
                : loading
                  ? 'text-[var(--console-cyan)]'
                  : 'text-[var(--console-amber)]'
            }`}
          >
            <Globe2 aria-hidden="true" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words font-semibold text-[var(--text-primary)]">
              {missionPathTitle}
            </span>
            <span className="mt-0.5 block break-words text-sm text-[var(--text-muted)]">
              {missionPathDetail}
            </span>
          </span>
          {featuredMission ? (
            <ChevronDown
              aria-hidden="true"
              size={19}
              className={`shrink-0 text-[var(--text-muted)] transition-transform ${
                mobileMapOpen ? 'rotate-180' : ''
              }`}
            />
          ) : null}
        </button>
        {mobileMapOpen && featuredMission && !desktopMapEnabled ? (
          <div id="mobile-mission-map" className="mt-2">
            <TrajectoryErrorBoundary resetKey={featuredMission.id}>
              <MissionTrajectory launch={featuredMission} />
            </TrajectoryErrorBoundary>
          </div>
        ) : null}
      </section>

      {featuredMission ? (
        <MissionVisualDisclosure
          launch={featuredMission}
          loading={needsVisualEnrichment && featuredDetail.enriching}
          error={
            needsVisualEnrichment
              ? featuredDetail.error ??
                (featuredDetail.notFound
                  ? 'Mission detail was not found.'
                  : null)
              : null
          }
          className="mt-4"
        />
      ) : null}
    </div>
  );
}

export default function HomeContent(): React.ReactElement {
  return (
    <Suspense fallback={<HomeExperience initialFilters={DEFAULT_FILTERS} />}>
      <HomeWithReturnContext />
    </Suspense>
  );
}
