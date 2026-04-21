'use client';

import AppShell from '@/components/layout/AppShell';
import MissionBootSequence from '@/components/layout/MissionBootSequence';
import HeroSection from '@/components/launch/HeroSection';
import LaunchList from '@/components/LaunchList';
import LaunchMap from '@/components/LaunchMap';
import { useLaunches } from '@/lib/hooks';

function HomeContent(): React.ReactElement {
  const { launches } = useLaunches();

  return (
    <>
      <HeroSection />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-6 sm:pb-8 lg:pb-10">
        {/* Mobile: Map first, then list */}
        <div className="lg:hidden mb-6">
          <LaunchMap launches={launches} />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main: Launch Grid */}
          <div className="flex-1 min-w-0">
            <LaunchList />
          </div>
          {/* Desktop Sidebar: Map */}
          <div className="hidden lg:block lg:w-[380px] flex-shrink-0">
            <div className="sticky top-16">
              <LaunchMap launches={launches} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Home(): React.ReactElement {
  return (
    <AppShell>
      <MissionBootSequence />
      <HomeContent />
    </AppShell>
  );
}
