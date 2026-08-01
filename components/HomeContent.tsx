'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Globe2 } from 'lucide-react';
import HeroSection from '@/components/launch/HeroSection';
import MissionVisualDisclosure from '@/components/launch/MissionVisualDisclosure';
import LaunchList from '@/components/LaunchList';
import { useLaunchById, useLaunches } from '@/lib/hooks';
import { selectLaunchVisual } from '@/lib/launch-visual';
import { parseScheduleFilters } from '@/lib/schedule-return';

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

function ScheduleWithReturnContext(): React.ReactElement {
  const searchParams = useSearchParams();
  const initialFilters = useMemo(
    () => parseScheduleFilters(searchParams),
    [searchParams],
  );

  return (
    <LaunchList
      key={searchParams.toString()}
      initialFilters={initialFilters}
    />
  );
}

export default function HomeContent(): React.ReactElement {
  const { launches, loading, refreshing, error, meta, refresh } = useLaunches();
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [desktopMapEnabled, setDesktopMapEnabled] = useState(false);

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
  const featuredDetail = useLaunchById(
    needsVisualEnrichment || needsCoverageEnrichment
      ? featuredLaunch?.id
      : null,
  );
  const featuredMission = featuredDetail.launch ?? featuredLaunch;

  return (
    <div className="page-container py-4 sm:py-5 lg:py-6">
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <HeroSection
          activeLaunch={featuredMission}
          loading={loading}
          refreshing={refreshing}
          error={error}
          partial={Boolean(meta?.partial)}
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
          ) : desktopMapEnabled ? (
            <MissionTrajectory launch={featuredMission} />
          ) : (
            <TrajectoryLoadingState />
          )}
        </aside>
      </div>

      <div className="mt-4">
        <Suspense fallback={<LaunchList />}>
          <ScheduleWithReturnContext />
        </Suspense>
      </div>

      <section className="mt-4 lg:hidden">
        <button
          type="button"
          aria-expanded={mobileMapOpen}
          aria-controls="mobile-mission-map"
          onClick={() => setMobileMapOpen((value) => !value)}
          className="surface-card flex min-h-[4.5rem] w-full items-center gap-3 px-4 text-left transition-colors hover:border-[var(--border-accent)] hover:bg-[var(--surface-subtle)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--console-green)]">
            <Globe2 aria-hidden="true" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-[var(--text-primary)]">
              Illustrative mission path
            </span>
            <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
              Launch site and modeled mission phases
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            size={19}
            className={`shrink-0 text-[var(--text-muted)] transition-transform ${
              mobileMapOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {mobileMapOpen && !desktopMapEnabled ? (
          <div id="mobile-mission-map" className="mt-2">
            <MissionTrajectory launch={featuredMission} />
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
