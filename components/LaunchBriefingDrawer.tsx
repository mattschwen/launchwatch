'use client';

import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Launch } from '@/lib/types';
import { useLaunchIntel } from '@/lib/hooks';
import { inferLaunchProvider } from '@/lib/youtube';
import StatusBadge from './ui/StatusBadge';

interface LaunchBriefingDrawerProps {
  launch: Launch | null;
  open: boolean;
  onClose: () => void;
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return 'Unavailable';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function relativeTime(dateString?: string | null) {
  if (!dateString) return null;

  const diffHours = Math.round((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
  if (Number.isNaN(diffHours)) return null;
  if (diffHours === 0) return 'within the last hour';
  if (diffHours > 0) return `${diffHours}h ago`;
  return `in ${Math.abs(diffHours)}h`;
}

export default function LaunchBriefingDrawer({
  launch,
  open,
  onClose,
}: LaunchBriefingDrawerProps): React.ReactElement | null {
  const { intel, loading } = useLaunchIntel(launch, open && Boolean(launch));

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open || !launch) {
    return null;
  }

  const provider = launch.provider || inferLaunchProvider(launch);

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-[var(--console-green)]/15 bg-[var(--bg-primary)] shadow-[-24px_0_60px_rgba(0,0,0,0.45)]">
        <header className="border-b border-[var(--panel-border)] bg-[var(--bg-secondary)] px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="console-heading text-xs">MISSION BRIEFING</p>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 border border-[var(--console-red)]/30 px-3 py-2 text-[10px] font-[family-name:var(--font-geist-mono)] font-bold tracking-wider text-[var(--console-red)] transition-colors hover:bg-[var(--console-red)]/10"
              aria-label="Close mission briefing"
            >
              <X size={14} />
              CLOSE
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={launch.status} statusName={launch.statusName} />
            <span className="border border-[var(--panel-border)] px-2 py-1 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)]">
              {provider.toUpperCase()}
            </span>
            <span className="border border-[var(--panel-border)] px-2 py-1 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)]">
              {launch.rocket}
            </span>
          </div>

          <h2 className="mt-3 text-lg font-bold leading-tight text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)] sm:text-xl">
            {launch.name}
          </h2>

          <p className="mt-2 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)]">
            {formatDateTime(launch.date)} {'//'} {launch.launchSite}
          </p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="console-label text-[10px]">RECOMMENDED ACTION</p>
                <p className="mt-2 text-base text-[var(--text-primary)] font-[family-name:var(--font-geist-mono)]">
                  {intel?.summary.recommendedLabel || 'BUILDING LAUNCH INTELLIGENCE'}
                </p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  {intel?.summary.rationale || 'Checking provider channels, stream candidates, and public coverage.'}
                </p>
              </div>

              {intel?.summary.recommendedUrl && (
                <a
                  href={intel.summary.recommendedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 border border-[var(--console-cyan)]/35 px-4 py-2 text-xs font-[family-name:var(--font-geist-mono)] font-bold tracking-wider text-[var(--console-cyan)] transition-colors hover:bg-[var(--console-cyan)]/10"
                >
                  <ExternalLink size={14} />
                  {intel.summary.recommendedLabel.toUpperCase()}
                </a>
              )}
            </div>
          </section>

          {launch.description && (
            <section className="panel p-4">
              <p className="console-label text-[10px]">MISSION CONTEXT</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{launch.description}</p>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="panel p-4">
              <p className="console-label text-[10px]">STATUS</p>
              <p className="mt-2 text-sm font-[family-name:var(--font-geist-mono)] text-[var(--text-primary)]">{launch.statusName || launch.status.toUpperCase()}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{launch.launchSite}</p>
            </div>

            <div className="panel p-4">
              <p className="console-label text-[10px]">COVERAGE CLOCK</p>
              <p className="mt-2 text-sm font-[family-name:var(--font-geist-mono)] text-[var(--text-primary)]">
                {intel ? formatDateTime(intel.summary.lastUpdated) : 'Pending'}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Refreshes while the briefing stays open.</p>
            </div>
          </section>

          <section className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="console-label text-[10px]">STREAM INTELLIGENCE</p>
                <h3 className="mt-1 text-base font-[family-name:var(--font-geist-mono)] text-[var(--text-primary)]">RANKED VIEWING LEADS</h3>
              </div>
              {loading && (
                <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)]">
                  REFRESHING…
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {(intel?.streamCandidates || []).map((candidate) => (
                <div key={candidate.id} className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--console-cyan)]/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="border border-[var(--console-cyan)]/20 px-2 py-1 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--console-cyan)]">
                          {candidate.liveStatus.toUpperCase()}
                        </span>
                        <span className="border border-[var(--console-green)]/20 px-2 py-1 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--console-green)]">
                          {candidate.confidence.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{candidate.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{candidate.channelTitle}</p>
                      {candidate.note && <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{candidate.note}</p>}
                      {(candidate.actualStartTime || candidate.scheduledStartTime) && (
                        <p className="mt-2 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)]">
                          {candidate.actualStartTime ? 'STARTED' : 'SCHEDULED'} {formatDateTime(candidate.actualStartTime || candidate.scheduledStartTime)}
                        </p>
                      )}
                    </div>

                    <a
                      href={candidate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[40px] items-center gap-1.5 border border-[var(--panel-border)] px-3 py-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-primary)] transition-colors hover:border-[var(--console-cyan)]/30 hover:text-[var(--console-cyan)]"
                    >
                      <ExternalLink size={12} />
                      OPEN
                    </a>
                  </div>
                </div>
              ))}

              {!loading && (!intel || intel.streamCandidates.length === 0) && (
                <p className="text-sm text-[var(--text-secondary)]">No ranked stream candidates yet. Use the quick links below to keep tracking the launch.</p>
              )}
            </div>
          </section>

          <section className="panel p-4">
            <p className="console-label text-[10px]">RECENT COVERAGE</p>
            <div className="mt-4 space-y-3">
              {(intel?.newsItems || []).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--console-cyan)]/30"
                >
                  <div className="flex flex-wrap gap-2 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)]">
                    <span>{item.source}</span>
                    <span>{relativeTime(item.publishedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-[var(--text-primary)]">{item.title}</p>
                  {item.summary && <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-3">{item.summary}</p>}
                </a>
              ))}

              {!loading && (!intel || intel.newsItems.length === 0) && (
                <p className="text-sm text-[var(--text-secondary)]">No fresh coverage matched this launch yet.</p>
              )}
            </div>
          </section>

          <section className="panel p-4">
            <p className="console-label text-[10px]">COMMUNITY PULSE</p>
            <div className="mt-4 space-y-3">
              {(intel?.socialItems || []).map((item) => (
                <a
                  key={`${item.platform}-${item.id}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--console-green)]/30"
                >
                  <div className="flex flex-wrap gap-2 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-muted)]">
                    <span>{item.platform.toUpperCase()}</span>
                    {item.community && <span>{item.community}</span>}
                    <span>{relativeTime(item.publishedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-[var(--text-primary)] line-clamp-3">{item.title}</p>
                  {(item.author || item.note) && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      {[item.author, item.note].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </a>
              ))}

              {!loading && (!intel || intel.socialItems.length === 0) && (
                <p className="text-sm text-[var(--text-secondary)]">No Reddit or X posts matched this launch yet.</p>
              )}
            </div>
          </section>

          <section className="panel p-4">
            <p className="console-label text-[10px]">QUICK LINKS</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {intel?.quickLinks.providerChannel && (
                <a href={intel.quickLinks.providerChannel} target="_blank" rel="noopener noreferrer" className="panel-interactive px-3 py-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-primary)]">
                  PROVIDER CHANNEL
                </a>
              )}
              {intel?.quickLinks.youtubeSearch && (
                <a href={intel.quickLinks.youtubeSearch} target="_blank" rel="noopener noreferrer" className="panel-interactive px-3 py-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-primary)]">
                  YOUTUBE SEARCH
                </a>
              )}
              {intel?.quickLinks.xSearch && (
                <a href={intel.quickLinks.xSearch} target="_blank" rel="noopener noreferrer" className="panel-interactive px-3 py-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-primary)]">
                  X SEARCH
                </a>
              )}
              {intel?.quickLinks.redditSearch && (
                <a href={intel.quickLinks.redditSearch} target="_blank" rel="noopener noreferrer" className="panel-interactive px-3 py-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-wider text-[var(--text-primary)]">
                  REDDIT SEARCH
                </a>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
