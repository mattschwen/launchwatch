'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, Globe2 } from 'lucide-react';
import MissionBootSequence from '@/components/layout/MissionBootSequence';
import HeroSection from '@/components/launch/HeroSection';
import LaunchList from '@/components/LaunchList';
import { useLaunches } from '@/lib/hooks';

const LaunchMap = dynamic(() => import('@/components/LaunchMap'), {
  ssr: false,
  loading: () => <div className="skeleton h-[32rem] rounded-[var(--radius-md)]" />,
});

function HomeContent(): React.ReactElement {
  const { launches } = useLaunches();
  const [desktopMap, setDesktopMap] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const update = (): void => setDesktopMap(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <>
      <MissionBootSequence />
      <div className="page-container py-4 sm:py-6 lg:py-8">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(29rem,.92fr)]">
          <HeroSection />
          {desktopMap ? (
            <aside aria-label="Mission map" className="min-w-0">
              <LaunchMap launches={launches} />
            </aside>
          ) : null}
        </div>

        <div className="mt-5 sm:mt-6">
          <LaunchList />
        </div>

        {!desktopMap ? (
          <section className="mt-5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-base)]">
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
                  Mission map
                </span>
                <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
                  Explore launch sites and upcoming ground tracks
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
                className="border-t border-[var(--border-subtle)] p-3"
              >
                <LaunchMap launches={launches} />
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}

export default function Home(): React.ReactElement {
  return <HomeContent />;
}
