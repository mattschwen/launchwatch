'use client';

import { useState, useEffect, use } from 'react';
import { Launch } from '@/lib/types';
import { useLaunchIntel } from '@/lib/hooks';
import AppShell from '@/components/layout/AppShell';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoFallback from '@/components/video/VideoFallback';
import ConsolePanel from '@/components/ui/ConsolePanel';
import TelemetryReadout from '@/components/ui/TelemetryReadout';
import ProgressCountdown from '@/components/ui/ProgressCountdown';
import StatusBadge from '@/components/ui/StatusBadge';
import AddToCalendar from '@/components/AddToCalendar';
import LaunchBriefingDrawer from '@/components/LaunchBriefingDrawer';
import LaunchIntelDeck from '@/components/launch/LaunchIntelDeck';
import Link from 'next/link';
import { Rocket, Tv, ArrowLeft, ExternalLink, Clock, Search } from 'lucide-react';

function LaunchDetailContent({ id }: { id: string }): React.ReactElement {
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { intel, loading: intelLoading } = useLaunchIntel(launch, Boolean(launch));

  useEffect(() => {
    async function fetchLaunch(): Promise<void> {
      try {
        const allRes = await fetch('/api/launches?type=all');
        const allData = await allRes.json();
        const found = (allData.launches || []).find((l: Launch) => l.id === id);
        if (found) {
          setLaunch(found);
        } else {
          setError('Launch not found');
        }
      } catch {
        setError('Failed to load launch details');
      } finally {
        setLoading(false);
      }
    }

    fetchLaunch();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        <div className="panel p-6 animate-pulse space-y-4">
          <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4" />
          <div className="h-8 bg-[var(--bg-tertiary)] rounded w-2/3" />
          <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3" />
          <div className="h-20 bg-[var(--bg-tertiary)] rounded" />
        </div>
      </div>
    );
  }

  if (error || !launch) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-12 text-center">
        <ConsolePanel label="ERROR">
          <Rocket size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
          <h1 className="text-lg font-bold text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)] mb-2">{error || 'LAUNCH NOT FOUND'}</h1>
          <Link href="/" className="text-sm text-[var(--console-cyan)] hover:underline font-[family-name:var(--font-geist-mono)]">
            &lt; BACK TO LAUNCHES
          </Link>
        </ConsolePanel>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--console-green)] transition-colors font-[family-name:var(--font-geist-mono)] tracking-wider"
      >
        <ArrowLeft size={14} />
        BACK TO LAUNCHES
      </Link>

      {/* Video (live only) */}
      {launch.isLive && launch.livestream && (
        <div>
          <VideoPlayer url={launch.livestream} title={launch.name} />
        </div>
      )}

      {/* Mission Parameters */}
      <ConsolePanel label="MISSION PARAMETERS">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={launch.status} statusName={launch.statusName} />
              {launch.provider && launch.provider !== 'Unknown' && (
                <span className="console-label text-[10px]">{launch.provider}</span>
              )}
              {launch.missionType && (
                <span className="text-[10px] px-2 py-0.5 border border-[var(--console-cyan)]/20 text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
                  {launch.missionType}
                </span>
              )}
              {launch.program && (
                <span className="text-[10px] px-2 py-0.5 border border-[var(--secondary)]/20 text-[var(--secondary)] font-[family-name:var(--font-geist-mono)]">
                  {launch.program}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]">{launch.name}</h1>
            {launch.missionName && launch.missionName !== launch.name && (
              <p className="text-sm text-[var(--text-muted)] mt-1 font-[family-name:var(--font-geist-mono)]">{launch.missionName}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {launch.livestream ? (
              <Link
                href={`/watch?id=${launch.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--console-cyan)]/40 text-[var(--console-cyan)] text-xs font-[family-name:var(--font-geist-mono)] font-bold tracking-wider hover:bg-[var(--console-cyan)]/5 transition-colors"
              >
                <Tv size={14} />
                {launch.isLive ? 'WATCH LIVE' : 'WATCH'}
              </Link>
            ) : (
              <VideoFallback launch={launch} />
            )}
            <button
              onClick={() => setBriefingOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--console-green)]/35 text-[var(--console-green)] text-xs font-[family-name:var(--font-geist-mono)] font-bold tracking-wider hover:bg-[var(--console-green)]/8 transition-colors"
            >
              <Search size={14} />
              BRIEFING
            </button>
            <AddToCalendar launch={launch} variant="icon" />
          </div>
        </div>

        {/* Countdown */}
        {!launch.isLive && (launch.status === 'upcoming' || launch.status === 'tbd') && (
          <div className="mb-4">
            <ProgressCountdown targetDate={launch.date} size="md" showProgress />
          </div>
        )}

        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          <TelemetryReadout label="VEHICLE" value={launch.rocket} status="nominal" />
          <TelemetryReadout label="PAD" value={launch.launchSite} />
          <TelemetryReadout label="WINDOW" value={new Date(launch.date).toISOString().slice(0, 19).replace('T', ' ') + ' UTC'} />
          {launch.provider && launch.provider !== 'Unknown' && (
            <TelemetryReadout label="PROVIDER" value={launch.provider} />
          )}
          {launch.orbit && <TelemetryReadout label="ORBIT" value={launch.orbit} />}
          {launch.rocketFamily && <TelemetryReadout label="FAMILY" value={launch.rocketFamily} />}
          {launch.windowStart && launch.windowEnd && launch.windowStart !== launch.windowEnd && (
            <TelemetryReadout
              label="WIN.SPAN"
              value={`${new Date(launch.windowStart).toISOString().slice(11, 16)} – ${new Date(launch.windowEnd).toISOString().slice(11, 16)} UTC`}
            />
          )}
          {launch.location && (
            <TelemetryReadout
              label="COORDS"
              value={`${launch.location.lat.toFixed(4)}°, ${launch.location.lng.toFixed(4)}°`}
            />
          )}
        </div>
      </ConsolePanel>

      {/* Description */}
      {launch.description && (
        <ConsolePanel label="MISSION BRIEF">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{launch.description}</p>
        </ConsolePanel>
      )}

      {/* Timeline */}
      {launch.timeline && launch.timeline.length > 0 && (
        <ConsolePanel label="TIMELINE">
          <div className="space-y-1">
            {launch.timeline.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 py-1.5 border-b border-[var(--panel-border)] last:border-0">
                <span className="text-xs font-[family-name:var(--font-geist-mono)] text-[var(--console-cyan)] font-bold min-w-[60px] tabular-nums">
                  {event.relativeTime}
                </span>
                <div>
                  <p className="text-sm font-[family-name:var(--font-geist-mono)] font-medium text-[var(--text-primary)]">{event.type}</p>
                  <p className="text-xs text-[var(--text-muted)]">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </ConsolePanel>
      )}

      <LaunchIntelDeck launch={launch} intel={intel} loading={intelLoading} />

      {launch.livestreams && launch.livestreams.length > 0 && (
        <ConsolePanel label="AVAILABLE STREAMS">
          <div className="flex flex-wrap gap-2">
            {launch.livestreams.map((stream, idx) => (
              <a
                key={idx}
                href={stream.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 panel-interactive text-xs font-[family-name:var(--font-geist-mono)] text-[var(--text-primary)] tracking-wider"
              >
                {stream.isLive ? (
                  <span className="status-dot status-dot-critical animate-pulse" />
                ) : (
                  <ExternalLink size={12} />
                )}
                <span>{stream.title || `STREAM ${idx + 1}`}</span>
                {stream.type && (
                  <span className="text-[9px] px-1.5 py-0.5 border border-[var(--panel-border)] text-[var(--text-muted)]">
                    {stream.type}
                  </span>
                )}
              </a>
            ))}
          </div>
          {launch.livestreams.some((stream) => stream.startTime) && (
            <div className="mt-2 space-y-1">
              {launch.livestreams.filter((stream) => stream.startTime).map((stream, idx) => (
                <p key={idx} className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 font-[family-name:var(--font-geist-mono)]">
                  <Clock size={10} />
                  {stream.title}: {new Date(stream.startTime!).toISOString().slice(0, 16).replace('T', ' ')} UTC
                </p>
              ))}
            </div>
          )}
        </ConsolePanel>
      )}

      <LaunchBriefingDrawer launch={launch} open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </div>
  );
}

export default function LaunchDetailPage({ params }: { params: Promise<{ id: string }> }): React.ReactElement {
  const resolvedParams = use(params);

  return (
    <AppShell>
      <LaunchDetailContent id={resolvedParams.id} />
    </AppShell>
  );
}
