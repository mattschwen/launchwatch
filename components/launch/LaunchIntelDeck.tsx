'use client';

import { ExternalLink, MessagesSquare, Newspaper, Radio, Search, Signal, Tv } from 'lucide-react';
import ConsolePanel from '@/components/ui/ConsolePanel';
import { Launch, LaunchIntel, LaunchSocialItem, LaunchStreamCandidate } from '@/lib/types';

interface LaunchIntelDeckProps {
  launch: Launch;
  intel: LaunchIntel | null;
  loading?: boolean;
  className?: string;
}

function relativeTime(dateString?: string | null): string {
  if (!dateString) return 'No timestamp';
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(diffMs)) return 'No timestamp';

  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) < 60) {
    return diffMinutes >= 0 ? `${Math.max(1, diffMinutes)}m ago` : `in ${Math.abs(diffMinutes)}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return diffHours >= 0 ? `${diffHours}h ago` : `in ${Math.abs(diffHours)}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return diffDays >= 0 ? `${diffDays}d ago` : `in ${Math.abs(diffDays)}d`;
}

function getConfidenceWidth(candidate: LaunchStreamCandidate): number {
  if (typeof candidate.score === 'number') {
    return Math.max(18, Math.min(100, candidate.score));
  }

  switch (candidate.confidence) {
    case 'high':
      return 88;
    case 'medium':
      return 62;
    default:
      return 36;
  }
}

function getStateTone(streamState?: LaunchIntel['summary']['streamState']) {
  switch (streamState) {
    case 'live':
      return 'text-[var(--console-red)]';
    case 'upcoming':
      return 'text-[var(--console-green)]';
    case 'search':
      return 'text-[var(--console-amber)]';
    default:
      return 'text-[var(--console-cyan)]';
  }
}

function renderSocialMeta(item: LaunchSocialItem): string {
  return [item.platform.toUpperCase(), item.community || item.author || null, relativeTime(item.publishedAt)]
    .filter(Boolean)
    .join(' // ');
}

export default function LaunchIntelDeck({
  launch,
  intel,
  loading = false,
  className = '',
}: LaunchIntelDeckProps): React.ReactElement {
  const streamCandidates = intel?.streamCandidates || [];
  const newsItems = intel?.newsItems || [];
  const socialItems = intel?.socialItems || [];
  const summary = intel?.summary;
  const quickLinks = intel?.quickLinks;

  return (
    <ConsolePanel label="MISSION CONTROL FEED" className={className}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-[var(--panel-border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="console-label mb-2 text-[10px]">MEDIA COMPANION</p>
            <h2 className="display-title text-2xl text-[var(--text-primary)] sm:text-[2.1rem]">
              Stream radar, coverage, and community signal for {launch.name}.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Follow the strongest stream lead, then branch into public coverage and enthusiast chatter without leaving the mission board.
            </p>
          </div>

          <div className="min-w-[220px] border-l-2 border-[var(--console-cyan)]/35 pl-4">
            <p className="console-label text-[10px]">PRIMARY ACTION</p>
            <p className={`mt-2 text-lg font-semibold ${getStateTone(summary?.streamState)} font-[family-name:var(--font-geist-mono)]`}>
              {summary?.recommendedLabel || 'Building launch intelligence'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              {summary?.rationale || 'Cross-checking provider links, ranked YouTube candidates, news sources, and enthusiast feed signals.'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] px-4 py-3">
            <p className="console-label text-[10px]">STREAM STATE</p>
            <p className={`mt-2 text-lg font-semibold ${getStateTone(summary?.streamState)} font-[family-name:var(--font-geist-mono)]`}>
              {(summary?.streamState || 'standby').toUpperCase()}
            </p>
          </div>
          <div className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] px-4 py-3">
            <p className="console-label text-[10px]">RANKED LEADS</p>
            <p className="mt-2 text-lg font-semibold text-[var(--console-cyan)] font-[family-name:var(--font-geist-mono)]">
              {String(streamCandidates.length).padStart(2, '0')}
            </p>
          </div>
          <div className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] px-4 py-3">
            <p className="console-label text-[10px]">COVERAGE</p>
            <p className="mt-2 text-lg font-semibold text-[var(--console-green)] font-[family-name:var(--font-geist-mono)]">
              {String(newsItems.length).padStart(2, '0')}
            </p>
          </div>
          <div className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] px-4 py-3">
            <p className="console-label text-[10px]">COMMUNITY</p>
            <p className="mt-2 text-lg font-semibold text-[var(--console-amber)] font-[family-name:var(--font-geist-mono)]">
              {String(socialItems.length).padStart(2, '0')}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              {summary ? `Updated ${relativeTime(summary.lastUpdated)}` : 'Awaiting refresh'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <section className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--console-cyan)]">
                  <Signal size={14} />
                  <span className="console-label text-[10px]">STREAM CONFIDENCE LADDER</span>
                </div>
                {loading && (
                  <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.2em] text-[var(--text-muted)]">
                    REFRESHING
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {streamCandidates.slice(0, 4).map((candidate) => (
                  <a
                    key={candidate.id}
                    href={candidate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block border border-[var(--panel-border)] bg-[var(--bg-primary)]/80 p-3 transition-colors hover:border-[var(--console-cyan)]/35"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.18em] text-[var(--console-cyan)]">
                            {candidate.confidence.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.18em] text-[var(--text-muted)]">
                            {candidate.liveStatus.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.18em] text-[var(--console-green)]">
                            {candidate.source.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-primary)] group-hover:text-[var(--console-cyan)]">
                          {candidate.title}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)] font-[family-name:var(--font-geist-mono)]">
                          {candidate.channelTitle}
                        </p>
                        {candidate.note && (
                          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {candidate.note}
                          </p>
                        )}
                        <div className="mt-3 h-1 overflow-hidden bg-[var(--bg-secondary)]">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--console-green)] via-[var(--console-cyan)] to-[var(--console-cyan)] transition-[width] duration-300 [transition-timing-function:var(--ease-out-quart)]"
                            style={{ width: `${getConfidenceWidth(candidate)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        {typeof candidate.concurrentViewers === 'number' && (
                          <span className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.14em] text-[var(--console-red)]">
                            {candidate.concurrentViewers.toLocaleString()} LIVE
                          </span>
                        )}
                        <ExternalLink size={14} className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--console-cyan)]" />
                      </div>
                    </div>
                  </a>
                ))}

                {!loading && streamCandidates.length === 0 && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No ranked stream candidates yet. Use the quick links to keep tracking provider channels and community search.
                  </p>
                )}
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4">
                <div className="mb-4 flex items-center gap-2 text-[var(--console-green)]">
                  <Newspaper size={14} />
                  <span className="console-label text-[10px]">RECENT COVERAGE</span>
                </div>

                <div className="space-y-3">
                  {newsItems.slice(0, 3).map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-[var(--panel-border)] bg-[var(--bg-primary)]/80 p-3 transition-colors hover:border-[var(--console-green)]/35"
                    >
                      <p className="text-sm leading-snug text-[var(--text-primary)]">{item.title}</p>
                      <p className="mt-2 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.16em] text-[var(--text-muted)]">
                        {item.source.toUpperCase()} {'//'} {relativeTime(item.publishedAt)}
                      </p>
                    </a>
                  ))}
                  {!loading && newsItems.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)]">No matched coverage returned for this mission yet.</p>
                  )}
                </div>
              </section>

              <section className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4">
                <div className="mb-4 flex items-center gap-2 text-[var(--console-amber)]">
                  <MessagesSquare size={14} />
                  <span className="console-label text-[10px]">COMMUNITY PULSE</span>
                </div>

                <div className="space-y-3">
                  {socialItems.slice(0, 3).map((item) => (
                    <a
                      key={`${item.platform}-${item.id}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-[var(--panel-border)] bg-[var(--bg-primary)]/80 p-3 transition-colors hover:border-[var(--console-amber)]/35"
                    >
                      <p className="line-clamp-3 text-sm leading-snug text-[var(--text-primary)]">{item.title}</p>
                      <p className="mt-2 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.16em] text-[var(--text-muted)]">
                        {renderSocialMeta(item)}
                      </p>
                    </a>
                  ))}
                  {!loading && socialItems.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)]">No recent community signal matched this mission yet.</p>
                  )}
                </div>
              </section>
            </div>
          </div>

          <section className="space-y-4">
            <div className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-4 flex items-center gap-2 text-[var(--console-cyan)]">
                <Radio size={14} />
                <span className="console-label text-[10px]">ACTION RAIL</span>
              </div>

              <div className="space-y-3">
                {summary?.recommendedUrl && (
                  <a
                    href={summary.recommendedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border border-[var(--console-cyan)]/35 bg-[var(--console-cyan)]/6 px-4 py-3 text-[var(--console-cyan)] transition-colors hover:bg-[var(--console-cyan)]/10"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-[0.18em]">
                      <Tv size={14} />
                      {summary.recommendedLabel.toUpperCase()}
                    </span>
                    <ExternalLink size={14} />
                  </a>
                )}

                {quickLinks?.providerChannel && (
                  <a
                    href={quickLinks.providerChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border border-[var(--panel-border)] bg-[var(--bg-primary)]/80 px-4 py-3 text-[var(--text-primary)] transition-colors hover:border-[var(--console-green)]/35 hover:text-[var(--console-green)]"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-[0.18em]">
                      <Tv size={14} />
                      PROVIDER CHANNEL
                    </span>
                    <ExternalLink size={14} />
                  </a>
                )}

                {quickLinks?.youtubeSearch && (
                  <a
                    href={quickLinks.youtubeSearch}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border border-[var(--panel-border)] bg-[var(--bg-primary)]/80 px-4 py-3 text-[var(--text-primary)] transition-colors hover:border-[var(--console-cyan)]/35 hover:text-[var(--console-cyan)]"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-[0.18em]">
                      <Search size={14} />
                      YOUTUBE SEARCH
                    </span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            <div className="border border-[var(--panel-border)] bg-[var(--bg-secondary)] p-4">
              <p className="console-label mb-3 text-[10px]">OUTSIDE SIGNALS</p>
              <div className="space-y-3">
                {quickLinks?.redditSearch && (
                  <a
                    href={quickLinks.redditSearch}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border border-[var(--panel-border)] bg-[var(--bg-primary)]/80 px-4 py-3 text-[var(--text-primary)] transition-colors hover:border-[var(--console-amber)]/35 hover:text-[var(--console-amber)]"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-[0.18em]">
                      <MessagesSquare size={14} />
                      REDDIT SEARCH
                    </span>
                    <ExternalLink size={14} />
                  </a>
                )}
                {quickLinks?.xSearch && (
                  <a
                    href={quickLinks.xSearch}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border border-[var(--panel-border)] bg-[var(--bg-primary)]/80 px-4 py-3 text-[var(--text-primary)] transition-colors hover:border-[var(--console-green)]/35 hover:text-[var(--console-green)]"
                  >
                    <span className="inline-flex items-center gap-2 text-xs font-[family-name:var(--font-geist-mono)] tracking-[0.18em]">
                      <Radio size={14} />
                      X LIVE SEARCH
                    </span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </ConsolePanel>
  );
}
