'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, ExternalLink, Rocket, Search } from 'lucide-react';
import { useLaunchIntel, useLaunches, useLiveLaunches } from '@/lib/hooks';
import AddToCalendar from '@/components/AddToCalendar';
import Countdown from '@/components/Countdown';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import AppShell from '@/components/layout/AppShell';
import ConsolePanel from '@/components/ui/ConsolePanel';
import StatusBadge from '@/components/ui/StatusBadge';
import TelemetryReadout from '@/components/ui/TelemetryReadout';
import VideoFallback from '@/components/video/VideoFallback';
import VideoPlayer from '@/components/video/VideoPlayer';

function WatchPageContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const { liveLaunches } = useLiveLaunches();
  const { launches } = useLaunches();
  const [manualSelectionId, setManualSelectionId] = useState<string | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);

  const upcomingLaunches = useMemo(
    () => launches.filter((launch) => !launch.isLive && (launch.status === 'upcoming' || launch.status === 'tbd')),
    [launches]
  );

  const selectedLaunch = useMemo(() => {
    const targetId = manualSelectionId || requestedId;
    if (targetId) {
      const found = [...liveLaunches, ...launches].find((launch) => launch.id === targetId);
      if (found) return found;
    }
    if (liveLaunches.length > 0) return liveLaunches[0];
    if (upcomingLaunches.length > 0) return upcomingLaunches[0];
    if (launches.length > 0) return launches[0];
    return null;
  }, [manualSelectionId, requestedId, liveLaunches, launches, upcomingLaunches]);

  const isLive = selectedLaunch?.isLive || false;
  const isPast = selectedLaunch?.status === 'success' || selectedLaunch?.status === 'failure';
  const { intel } = useLaunchIntel(selectedLaunch, Boolean(selectedLaunch));

  const formatDate = (dateString: string): string =>
    new Date(dateString).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          {selectedLaunch ? (
            <>
              {selectedLaunch.livestream ? (
                <div className="mb-4">
                  <VideoPlayer url={selectedLaunch.livestream} title={selectedLaunch.name} autoplay={isLive} />
                  {isLive && (
                    <div className="mt-2 flex items-center gap-2 px-1">
                      <span className="status-dot status-dot-critical animate-pulse" />
                      <span className="text-xs font-bold tracking-wider text-[var(--console-red)] font-[family-name:var(--font-geist-mono)]">
                        LIVE NOW
                      </span>
                    </div>
                  )}
                  {isPast && (
                    <div className="mt-2 flex items-center gap-2 px-1">
                      <span className="text-xs tracking-wider text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                        RECORDED STREAM
                      </span>
                    </div>
                  )}
                </div>
              ) : isPast ? (
                <div className="panel mb-4 flex aspect-video w-full flex-col items-center justify-center gap-4 border border-[var(--panel-border)] bg-[var(--bg-tertiary)]">
                  <Rocket size={40} className="text-[var(--text-muted)]" />
                  <p className="text-lg font-bold tracking-wider text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]">
                    LAUNCH COMPLETE
                  </p>
                  <StatusBadge status={selectedLaunch.status} statusName={selectedLaunch.statusName} />
                </div>
              ) : (
                <div className="panel mb-4 flex aspect-video w-full flex-col items-center justify-center gap-4 border border-[var(--panel-border)] bg-[var(--bg-tertiary)]">
                  {selectedLaunch.videoThumbnail ? (
                    <div className="relative h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedLaunch.videoThumbnail}
                        alt={selectedLaunch.name}
                        className="h-full w-full object-cover opacity-20"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <p className="console-label text-xs">STREAM STARTS IN</p>
                        <Countdown targetDate={selectedLaunch.date} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="console-label text-xs">STREAM STARTS IN</p>
                      <Countdown targetDate={selectedLaunch.date} />
                    </>
                  )}
                </div>
              )}

              <ConsolePanel label="STREAM INFO">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <StatusBadge status={selectedLaunch.status} statusName={selectedLaunch.statusName} />
                      {selectedLaunch.provider && <span className="console-label text-[10px]">{selectedLaunch.provider}</span>}
                    </div>

                    <Link href={`/launch/${selectedLaunch.id}`}>
                      <h1 className="display-title text-xl text-[var(--text-primary)] transition-colors hover:text-[var(--console-cyan)] sm:text-[1.8rem]">
                        {selectedLaunch.name}
                      </h1>
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedLaunch.livestream && (
                      <a
                        href={selectedLaunch.livestream}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 border border-[var(--panel-border)] px-3 py-2 text-xs tracking-wider text-[var(--text-muted)] transition-colors hover:border-[var(--console-cyan)]/30 hover:text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]"
                      >
                        <ExternalLink size={12} />
                        <span className="hidden sm:inline">YOUTUBE</span>
                      </a>
                    )}

                    <button
                      onClick={() => setBriefingOpen(true)}
                      className="inline-flex items-center gap-1.5 border border-[var(--console-green)]/35 px-3 py-2 text-xs tracking-wider text-[var(--console-green)] transition-colors hover:bg-[var(--console-green)]/10 font-[family-name:var(--font-geist-mono)]"
                    >
                      <Search size={12} />
                      BRIEF
                    </button>

                    <AddToCalendar launch={selectedLaunch} variant="icon" />
                  </div>
                </div>

                <div className="mb-4 space-y-0.5">
                  <TelemetryReadout label="VEHICLE" value={selectedLaunch.rocket} status="nominal" />
                  <TelemetryReadout label="PAD" value={selectedLaunch.launchSite} />
                  <TelemetryReadout label="WINDOW" value={formatDate(selectedLaunch.date)} />
                  {selectedLaunch.missionType && <TelemetryReadout label="MISSION" value={selectedLaunch.missionType} />}
                </div>

                {selectedLaunch.description && (
                  <p className="body-copy text-sm">{selectedLaunch.description}</p>
                )}

                <div className="mt-4 grid gap-3 border-t border-[var(--panel-border)] pt-3 sm:grid-cols-3">
                  <div>
                    <p className="console-label text-[10px]">STREAM LEADS</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
                      {String(intel?.streamCandidates?.length || 0).padStart(2, '0')}
                    </p>
                  </div>
                  <div>
                    <p className="console-label text-[10px]">NEWS MATCHES</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--console-green)] font-[family-name:var(--font-geist-mono)]">
                      {String(intel?.newsItems?.length || 0).padStart(2, '0')}
                    </p>
                  </div>
                  <div>
                    <p className="console-label text-[10px]">COMMUNITY SIGNAL</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--console-amber)] font-[family-name:var(--font-geist-mono)]">
                      {String(intel?.socialItems?.length || 0).padStart(2, '0')}
                    </p>
                  </div>
                </div>

                {!selectedLaunch.livestream && (
                  <div className="mt-4 border-t border-[var(--panel-border)] pt-3">
                    <p className="console-label mb-2 text-[10px]">FIND STREAM</p>
                    {intel?.summary.recommendedUrl ? (
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={intel.summary.recommendedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 border border-[var(--console-green)]/35 px-4 py-2.5 text-xs tracking-wider text-[var(--console-green)] transition-colors hover:bg-[var(--console-green)]/10 font-[family-name:var(--font-geist-mono)]"
                        >
                          {intel.summary.recommendedLabel.toUpperCase()}
                        </a>
                        <button
                          onClick={() => setBriefingOpen(true)}
                          className="panel-interactive inline-flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]"
                        >
                          OPEN BRIEFING
                        </button>
                      </div>
                    ) : (
                      <VideoFallback launch={selectedLaunch} />
                    )}
                  </div>
                )}

                {selectedLaunch.livestreams && selectedLaunch.livestreams.length > 1 && (
                  <div className="mt-4 border-t border-[var(--panel-border)] pt-3">
                    <p className="console-label mb-2 text-[10px]">AVAILABLE STREAMS</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLaunch.livestreams.map((stream, idx) => (
                        <a
                          key={idx}
                          href={stream.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="panel-interactive inline-flex items-center gap-2 px-3 py-2 text-xs tracking-wider text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]"
                        >
                          {stream.isLive ? (
                            <span className="status-dot status-dot-critical animate-pulse" />
                          ) : (
                            <ExternalLink size={12} />
                          )}
                          {stream.title || `STREAM ${idx + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </ConsolePanel>

              <LaunchIntelDeck launch={selectedLaunch} intel={intel} loading={Boolean(selectedLaunch && !intel)} className="mt-4" />
            </>
          ) : (
            <ConsolePanel label="STREAM MONITOR">
              <div className="py-12 text-center">
                <Rocket size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
                <h2 className="display-title mb-2 text-xl text-[var(--text-primary)]">
                  NO STREAM AVAILABLE
                </h2>
                <p className="text-sm text-[var(--text-muted)]">Check back when a launch is scheduled.</p>
              </div>
            </ConsolePanel>
          )}
        </div>

        <div className="space-y-4 lg:w-72 lg:flex-shrink-0">
          {liveLaunches.length > 0 && (
            <div>
              <p className="console-label mb-2 text-[10px]">LIVE NOW</p>
              <div className="space-y-1">
                {liveLaunches.map((launch) => (
                  <button
                    key={launch.id}
                    onClick={() => setManualSelectionId(launch.id)}
                    className={`flex w-full items-center gap-2.5 p-2.5 text-left transition-colors ${
                      selectedLaunch?.id === launch.id ? 'panel-live' : 'panel-interactive'
                    }`}
                  >
                    <span className="status-dot status-dot-critical animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]">
                        {launch.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">{launch.rocket}</p>
                    </div>
                    <ChevronRight size={12} className="flex-shrink-0 text-[var(--text-muted)]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="console-label mb-2 text-[10px]">UPCOMING</p>
            <div className="space-y-1">
              {upcomingLaunches.slice(0, 8).map((launch) => (
                <button
                  key={launch.id}
                  onClick={() => setManualSelectionId(launch.id)}
                  className={`flex w-full items-center gap-2.5 p-2.5 text-left transition-colors ${
                    selectedLaunch?.id === launch.id
                      ? 'border border-[var(--console-green)]/30 bg-[var(--console-green)]/5'
                      : 'panel-interactive'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]">
                      {launch.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                      {new Date(launch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {'//'} {launch.rocket}
                    </p>
                  </div>
                  <ChevronRight size={12} className="flex-shrink-0 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LaunchBriefingDrawer launch={selectedLaunch} open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </div>
  );
}

export default function WatchPage(): React.ReactElement {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 lg:px-6">
            <div className="panel mb-4 aspect-video animate-pulse bg-[var(--bg-tertiary)]" />
            <div className="panel animate-pulse p-6">
              <div className="mb-4 h-6 w-2/3 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-1/3 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        }
      >
        <WatchPageContent />
      </Suspense>
    </AppShell>
  );
}
