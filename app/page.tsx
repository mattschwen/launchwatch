'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, Globe2 } from 'lucide-react';
import HeroSection from '@/components/launch/HeroSection';
import LaunchList from '@/components/LaunchList';
import { useLaunchById, useLaunches } from '@/lib/hooks';
import { selectLaunchVisual } from '@/lib/launch-visual';

const MissionTrajectory = dynamic(
  () => import('@/components/MissionTrajectory'),
  {
  ssr: false,
    loading: () => (
      <div className="skeleton min-h-[27.5rem] rounded-[var(--radius-md)]" />
    ),
  },
);

const DESKTOP_MAP_QUERY = '(min-width: 64rem)';

function HomeContent(): React.ReactElement {
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
  const featuredDetail = useLaunchById(
    featuredVisual.status === 'available' ? null : featuredLaunch?.id
  );
  const featuredMission = featuredDetail.launch ?? featuredLaunch;

  return (
    <>
      <div className="page-container py-4 sm:py-5 lg:py-6">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <HeroSection
            activeLaunch={featuredMission}
            loading={loading}
            refreshing={refreshing}
            error={error}
            partial={Boolean(meta?.partial)}
            visualLoading={featuredDetail.enriching}
            visualError={
              featuredDetail.error ??
              (featuredDetail.notFound
                ? 'Mission detail was not found.'
                : null)
            }
            refresh={refresh}
          />
          <aside
            aria-label="Mission trajectory"
            className="hidden min-w-0 lg:block"
          >
            {desktopMapEnabled ? (
              <MissionTrajectory launch={featuredMission} />
            ) : (
              <div
                aria-hidden="true"
                className="skeleton min-h-[27.5rem] rounded-[var(--radius-md)]"
              />
            )}
          </aside>
        </div>

        <div className="mt-4">
          <LaunchList />
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
            <div
              id="mobile-mission-map"
              className="mt-2"
            >
              <MissionTrajectory launch={featuredMission} />
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

export default function Home(): React.ReactElement {
  return <HomeContent />;
}
