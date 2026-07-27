'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, Globe2 } from 'lucide-react';
import HeroSection from '@/components/launch/HeroSection';
import LaunchList from '@/components/LaunchList';
import { useLaunches } from '@/lib/hooks';

const MissionTrajectory = dynamic(
  () => import('@/components/MissionTrajectory'),
  {
  ssr: false,
    loading: () => (
      <div className="skeleton min-h-[27.5rem] rounded-[var(--radius-md)]" />
    ),
  },
);

function HomeContent(): React.ReactElement {
  const { launches, loading, error, meta, refresh } = useLaunches();
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const featuredLaunch =
    launches.find((launch) => launch.isLive) ??
    launches.find(
      (launch) => launch.status === 'upcoming' || launch.status === 'tbd',
    ) ??
    null;

  return (
    <>
      <div className="page-container py-4 sm:py-5 lg:py-6">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <HeroSection
            activeLaunch={featuredLaunch}
            loading={loading}
            error={error}
            partial={Boolean(meta?.partial)}
            refresh={refresh}
          />
          <aside
            aria-label="Mission trajectory"
            className="hidden min-w-0 lg:block"
          >
            <MissionTrajectory launch={featuredLaunch} />
          </aside>
        </div>

        <div className="mt-4">
          <LaunchList />
        </div>

        <section className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-base)] lg:hidden">
          <button
            type="button"
            aria-expanded={mobileMapOpen}
            aria-controls="mobile-mission-map"
            onClick={() => setMobileMapOpen((value) => !value)}
            className="flex min-h-[4.75rem] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-[var(--surface-subtle)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--console-green)]">
              <Globe2 aria-hidden="true" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[var(--text-primary)]">
                Mission trajectory
              </span>
              <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
                Launch site and illustrative mission phases
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
          {mobileMapOpen ? (
            <div
              id="mobile-mission-map"
              className="border-t border-[var(--border-subtle)]"
            >
              <MissionTrajectory launch={featuredLaunch} />
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
