'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Search } from 'lucide-react';
import { useLaunchIntel, useLiveLaunches, useNextLaunch } from '@/lib/hooks';
import AddToCalendar from '@/components/AddToCalendar';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import ConsolePanel from '@/components/ui/ConsolePanel';
import ProgressCountdown from '@/components/ui/ProgressCountdown';
import StatusBadge from '@/components/ui/StatusBadge';
import TelemetryReadout from '@/components/ui/TelemetryReadout';
import WarningLight from '@/components/ui/WarningLight';
import VideoFallback from '@/components/video/VideoFallback';
import VideoPlayer from '@/components/video/VideoPlayer';

export default function HeroSection(): React.ReactElement | null {
  const { liveLaunches } = useLiveLaunches();
  const { nextLaunch, loading } = useNextLaunch();
  const [briefingOpen, setBriefingOpen] = useState(false);

  const activeLaunch = liveLaunches.length > 0 ? liveLaunches[0] : nextLaunch;
  const isLiveMode = liveLaunches.length > 0;
  const { intel } = useLaunchIntel(activeLaunch, Boolean(activeLaunch));

  if (loading && !activeLaunch) {
    return (
      <div className="w-full">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
          <div className="panel animate-pulse p-6">
            <div className="mb-4 h-4 w-1/4 rounded bg-[var(--bg-tertiary)]" />
            <div className="mb-4 h-8 w-2/3 rounded bg-[var(--bg-tertiary)]" />
            <div className="h-6 w-1/2 rounded bg-[var(--bg-tertiary)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeLaunch) return null;

  const formatDate = (dateString: string): string =>
    new Date(dateString).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <ConsolePanel
          label={isLiveMode ? 'PRIMARY DISPLAY — LIVE' : 'PRIMARY DISPLAY'}
          variant={isLiveMode ? 'live' : 'default'}
          glowing={isLiveMode}
        >
          {isLiveMode ? (
            <>
              <div className="relative -mx-4 -mt-4 mb-4 sm:-mx-5 sm:-mt-5">
                <VideoPlayer url={activeLaunch.livestream} title={activeLaunch.name} className="rounded-none" />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <StatusBadge status="live" />
                    {activeLaunch.provider && <span className="console-label text-[10px]">{activeLaunch.provider}</span>}
                  </div>

                  <Link href={`/launch/${activeLaunch.id}`} className="transition-colors hover:text-[var(--console-cyan)]">
                    <h2 className="display-title mb-3 text-xl text-[var(--text-primary)] sm:text-[1.7rem]">
                      {activeLaunch.name}
                    </h2>
                  </Link>

                  <div className="space-y-0.5">
                    <TelemetryReadout label="VEHICLE" value={activeLaunch.rocket} status="nominal" />
                    <TelemetryReadout label="PAD" value={activeLaunch.launchSite} />
                    <TelemetryReadout label="WINDOW" value={formatDate(activeLaunch.date)} />
                  </div>

                  {intel?.summary.rationale && (
                    <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                      {intel.summary.rationale}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeLaunch.livestream && (
                    <a
                      href={activeLaunch.livestream}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-[var(--console-red)]/40 px-3 py-2 text-xs font-bold tracking-wider text-[var(--console-red)] transition-colors hover:bg-[var(--console-red)]/10 font-[family-name:var(--font-geist-mono)]"
                    >
                      <ExternalLink size={14} />
                      YOUTUBE
                    </a>
                  )}
                  <button
                    onClick={() => setBriefingOpen(true)}
                    className="inline-flex items-center gap-2 border border-[var(--console-green)]/35 px-3 py-2 text-xs font-bold tracking-wider text-[var(--console-green)] transition-colors hover:bg-[var(--console-green)]/10 font-[family-name:var(--font-geist-mono)]"
                  >
                    <Search size={14} />
                    BRIEFING
                  </button>
                  <AddToCalendar launch={activeLaunch} variant="icon" />
                </div>
              </div>

              {liveLaunches.length > 1 && (
                <div className="mt-4 border-t border-[var(--panel-border)] pt-3">
                  <p className="console-label mb-2 text-[10px]">ALSO LIVE:</p>
                  <div className="flex flex-wrap gap-2">
                    {liveLaunches.slice(1).map((launch) => (
                      <Link
                        key={launch.id}
                        href={`/watch?id=${launch.id}`}
                        className="panel-interactive inline-flex items-center gap-2 px-3 py-1.5 text-xs tracking-wider text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]"
                      >
                        <span className="status-dot status-dot-critical animate-pulse" />
                        {launch.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              <div className="flex-1">
                <p className="console-label mb-2 text-[10px]">NEXT LAUNCH</p>
                <Link href={`/launch/${activeLaunch.id}`} className="transition-colors hover:text-[var(--console-cyan)]">
                  <h2 className="display-title mb-4 text-2xl text-[var(--text-primary)] sm:text-[2.4rem] lg:text-[3.1rem]">
                    {activeLaunch.name}
                  </h2>
                </Link>

                <ProgressCountdown targetDate={activeLaunch.date} size="lg" showProgress className="mb-4" />

                {activeLaunch.description && (
                  <p className="body-copy mb-4 text-sm line-clamp-2">{activeLaunch.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {activeLaunch.livestream ? (
                    <Link
                      href={`/watch?id=${activeLaunch.id}`}
                      className="inline-flex items-center gap-2 border border-[var(--console-cyan)]/40 px-4 py-2 text-xs font-bold tracking-wider text-[var(--console-cyan)] transition-colors hover:bg-[var(--console-cyan)]/5 font-[family-name:var(--font-geist-mono)]"
                    >
                      WATCH STREAM
                    </Link>
                  ) : intel?.summary.recommendedUrl ? (
                    <a
                      href={intel.summary.recommendedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-[var(--console-green)]/40 px-4 py-2 text-xs font-bold tracking-wider text-[var(--console-green)] transition-colors hover:bg-[var(--console-green)]/5 font-[family-name:var(--font-geist-mono)]"
                    >
                      {intel.summary.recommendedLabel.toUpperCase()}
                    </a>
                  ) : (
                    <VideoFallback launch={activeLaunch} />
                  )}

                  <button
                    onClick={() => setBriefingOpen(true)}
                    className="inline-flex items-center gap-2 border border-[var(--panel-border)] px-4 py-2 text-xs font-bold tracking-wider text-[var(--text-primary)] transition-colors hover:border-[var(--console-green)]/30 hover:text-[var(--console-green)] font-[family-name:var(--font-geist-mono)]"
                  >
                    <Search size={14} />
                    MISSION BRIEF
                  </button>

                  <AddToCalendar launch={activeLaunch} variant="icon" />
                </div>

                {intel?.summary.rationale && (
                  <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)] font-[family-name:var(--font-geist-mono)]">
                    {intel.summary.rationale}
                  </p>
                )}
              </div>

              <div className="lg:w-72 lg:flex-shrink-0">
                <p className="console-label mb-3 text-[10px]">TELEMETRY</p>
                <div className="panel space-y-1 p-3">
                  <div className="mb-1 flex items-center gap-3 border-b border-[var(--panel-border)] py-2">
                    <WarningLight
                      color={activeLaunch.status === 'upcoming' ? 'green' : activeLaunch.status === 'tbd' ? 'amber' : 'red'}
                      size="lg"
                      spinning={activeLaunch.status === 'upcoming' || activeLaunch.status === 'live'}
                    />
                    <div>
                      <span className="console-label block text-[9px]">STATUS</span>
                      <span
                        className={`text-sm font-bold tracking-wider font-[family-name:var(--font-geist-mono)] ${
                          activeLaunch.status === 'upcoming'
                            ? 'text-[var(--console-green)]'
                            : activeLaunch.status === 'live'
                              ? 'text-[var(--console-red)]'
                              : activeLaunch.status === 'tbd'
                                ? 'text-[var(--console-amber)]'
                                : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {activeLaunch.status === 'upcoming' ? 'GO FOR LAUNCH' : (activeLaunch.statusName || activeLaunch.status.toUpperCase())}
                      </span>
                    </div>
                  </div>

                  <TelemetryReadout label="VEHICLE" value={activeLaunch.rocket} />
                  <TelemetryReadout label="PAD" value={activeLaunch.launchSite} />
                  <TelemetryReadout label="WINDOW" value={formatDate(activeLaunch.date)} />
                  {activeLaunch.provider && activeLaunch.provider !== 'Unknown' && (
                    <TelemetryReadout label="PROVIDER" value={activeLaunch.provider} />
                  )}
                  {activeLaunch.missionType && <TelemetryReadout label="MISSION" value={activeLaunch.missionType} />}
                  {activeLaunch.program && <TelemetryReadout label="PROGRAM" value={activeLaunch.program} />}
                </div>
              </div>
            </div>
          )}
        </ConsolePanel>
      </div>

      <LaunchBriefingDrawer launch={activeLaunch} open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </div>
  );
}
