'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Newspaper,
  Radio,
  Search,
} from 'lucide-react';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import CoverageSignal from './CoverageSignal';
import { publicLaunchIntelRationale } from '@/lib/launch-intel-copy';
import type {
  Launch,
  LaunchIntel,
  LaunchNewsItem,
  LaunchSocialItem,
  LaunchStreamCandidate,
} from '@/lib/types';

const INITIAL_STREAM_LEADS = 4;
const INITIAL_COMMUNITY_SIGNALS = 4;

interface LaunchIntelDeckProps {
  launch: Launch;
  intel: LaunchIntel | null;
  loading?: boolean;
  offline?: boolean;
  error?: string | null;
  retryAt?: number | null;
  onRetry?: () => void;
  className?: string;
}

function formatRetryDelay(seconds: number): string {
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`;
  return `${seconds}s`;
}

function IntelligenceRetryButton({
  loading,
  retryAt,
  onRetry,
}: {
  loading: boolean;
  retryAt: number | null;
  onRetry: () => void;
}): React.ReactElement {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!retryAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [retryAt]);

  const retrySeconds = retryAt
    ? Math.max(0, Math.ceil((retryAt - now) / 1_000))
    : 0;
  const waiting = retrySeconds > 0;
  const unavailable = loading || waiting;

  return (
    <button
      type="button"
      onClick={() => {
        if (!unavailable) onRetry();
      }}
      aria-disabled={unavailable}
      aria-busy={loading}
      className={`action-button action-button-secondary mt-5 aria-disabled:opacity-60 ${
        loading
          ? 'aria-disabled:cursor-wait'
          : waiting
            ? 'aria-disabled:cursor-not-allowed'
            : ''
      }`}
    >
      {loading
        ? 'Retrying coverage…'
        : waiting
          ? `Retry in ${formatRetryDelay(retrySeconds)}`
          : 'Retry coverage'}
    </button>
  );
}

function formatPublishedAt(value: string | null | undefined): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function StreamRow({
  candidate,
}: {
  candidate: LaunchStreamCandidate;
}): React.ReactElement {
  return (
    <a
      href={candidate.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-[4.25rem] min-w-0 items-start gap-3 border-b border-[var(--border-subtle)] px-4 py-3 transition-colors last:border-0 hover:bg-[var(--surface-subtle)]"
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
          candidate.liveStatus === 'live'
            ? 'status-dot-live bg-[var(--console-magenta)]'
            : candidate.confidence === 'high'
              ? 'bg-[var(--console-green)]'
              : 'bg-[var(--console-amber)]'
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold leading-5 text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
          {candidate.title}
        </span>
        <span className="mt-0.5 block break-words text-xs leading-5 text-[var(--text-muted)]">
          {candidate.channelTitle || 'Provider stream'} · {candidate.confidence}{' '}
          confidence
        </span>
      </span>
      <ExternalLink
        aria-hidden="true"
        size={15}
        className="mt-0.5 shrink-0 text-[var(--text-muted)]"
      />
      <ExternalLinkHint />
    </a>
  );
}

function NewsRow({ item }: { item: LaunchNewsItem }): React.ReactElement {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border-b border-[var(--border-subtle)] px-4 py-3 last:border-0 hover:bg-[var(--surface-subtle)]"
    >
      <span className="block text-sm font-semibold leading-5 text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
        {item.title}
      </span>
      <span className="mt-1 block text-xs text-[var(--text-muted)]">
        {item.source} · {formatPublishedAt(item.publishedAt)}
      </span>
      <ExternalLinkHint />
    </a>
  );
}

function SocialRow({ item }: { item: LaunchSocialItem }): React.ReactElement {
  const officialSpaceX =
    item.platform === 'x' && item.community?.trim().toLowerCase() === '@spacex';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border-b border-[var(--border-subtle)] px-4 py-3 last:border-0 hover:bg-[var(--surface-subtle)]"
    >
      <span className="block text-sm font-semibold leading-5 text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
        {item.title}
      </span>
      <span className="mt-1 block text-xs text-[var(--text-muted)]">
        {item.platform === 'reddit' ? 'Reddit' : 'X'}
        {item.community ? ` · ${item.community}` : ''}
        {item.publishedAt ? ` · ${formatPublishedAt(item.publishedAt)}` : ''}
      </span>
      {officialSpaceX || item.note ? (
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.68rem] leading-5">
          {officialSpaceX ? (
            <span className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-cyan)_32%,transparent)] bg-[color-mix(in_srgb,var(--console-cyan)_8%,transparent)] px-1.5 py-0.5 font-semibold uppercase tracking-[0.08em] text-[var(--console-cyan)]">
              Official @SpaceX
            </span>
          ) : null}
          {item.note ? (
            <span className="text-[var(--text-secondary)]">{item.note}</span>
          ) : null}
        </span>
      ) : null}
      <ExternalLinkHint />
    </a>
  );
}

export default function LaunchIntelDeck({
  launch,
  intel,
  loading = false,
  offline = false,
  error = null,
  retryAt = null,
  onRetry,
  className = '',
}: LaunchIntelDeckProps): React.ReactElement {
  const regionRef = useRef<HTMLElement>(null);
  const recoveryPendingRef = useRef(false);
  const streamListId = `${useId()}-stream-leads`;
  const socialListId = `${useId()}-social-signals`;
  const [expandedSignals, setExpandedSignals] = useState<{
    launchId: string | null;
    social: boolean;
    streams: boolean;
  }>({ launchId: null, social: false, streams: false });
  const streamsExpanded =
    expandedSignals.launchId === launch.id && expandedSignals.streams;
  const socialExpanded =
    expandedSignals.launchId === launch.id && expandedSignals.social;

  useEffect(() => {
    recoveryPendingRef.current = false;
  }, [launch.id]);

  useEffect(() => {
    if (!intel || loading || !recoveryPendingRef.current) return;
    recoveryPendingRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      regionRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [intel, loading]);

  const retryCoverage = (): void => {
    if (loading || !onRetry) return;
    recoveryPendingRef.current = true;
    onRetry();
  };

  if (loading && !intel && !error) {
    return (
      <section
        ref={regionRef}
        tabIndex={-1}
        aria-labelledby="mission-intelligence-loading-title"
        aria-describedby="mission-intelligence-loading-description"
        aria-busy="true"
        className={`surface-card holo-card signal-cold p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${className}`}
      >
        <header className="flex items-start gap-3">
          <Radio
            aria-hidden="true"
            size={20}
            className="mt-0.5 shrink-0 text-[var(--console-cyan)]"
          />
          <div className="min-w-0">
            <p className="data-label text-[var(--console-cyan)]">
              Signal acquisition
            </p>
            <h2
              id="mission-intelligence-loading-title"
              className="section-title mt-2"
            >
              Mission intelligence
            </h2>
            <p
              id="mission-intelligence-loading-description"
              role="status"
              className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]"
            >
              Correlating verified public coverage for {launch.name}.
            </p>
          </div>
        </header>
        <div aria-hidden="true" className="mt-5">
          <div className="skeleton h-16 rounded" />
          <div className="skeleton mt-3 h-16 rounded" />
          <div className="skeleton mt-3 h-16 rounded" />
        </div>
      </section>
    );
  }

  if (!intel) {
    return (
      <section
        ref={regionRef}
        tabIndex={-1}
        aria-labelledby="mission-intelligence-title"
        aria-busy={loading}
        className={`surface-card holo-card ${
          error || offline ? 'signal-warm' : 'signal-cold'
        } p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] sm:p-6 ${className}`}
      >
        <div className="flex items-start gap-3">
          {error || offline ? (
            <AlertTriangle
              aria-hidden="true"
              size={20}
              className="mt-0.5 shrink-0 text-[var(--console-amber)]"
            />
          ) : (
            <Radio
              aria-hidden="true"
              size={20}
              className="mt-0.5 shrink-0 text-[var(--console-cyan)]"
            />
          )}
          <div>
            <h2 id="mission-intelligence-title" className="section-title">
              Mission intelligence
            </h2>
            {offline ? (
              <p
                role="status"
                aria-label="Mission intelligence offline"
                className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]"
              >
                <strong className="font-semibold text-[var(--console-amber)]">
                  Device offline.
                </strong>{' '}
                Coverage signals cannot be checked right now. Reconnect to load
                mission intelligence.
              </p>
            ) : error ? (
              <p
                role="alert"
                className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]"
              >
                Coverage signals could not be checked. Official provider links
                remain available while the intelligence feed recovers.
                <span className="mt-2 block font-mono text-xs text-[var(--console-amber)]">
                  {error}
                </span>
              </p>
            ) : (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                No verified stream, coverage, or social signal is available
                for this mission yet. Official provider links remain the source
                of truth.
              </p>
            )}
            {error && !offline && onRetry ? (
              <IntelligenceRetryButton
                key={retryAt ?? 'available'}
                loading={loading}
                retryAt={retryAt}
                onRetry={retryCoverage}
              />
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const streamLeads = intel.streamCandidates.filter(
    (candidate) => candidate.source !== 'search'
  );
  const streams = streamsExpanded
    ? streamLeads
    : streamLeads.slice(0, INITIAL_STREAM_LEADS);
  const news = intel.newsItems.slice(0, 5);
  const social = socialExpanded
    ? intel.socialItems
    : intel.socialItems.slice(0, INITIAL_COMMUNITY_SIGNALS);
  const hiddenStreamCount = streamLeads.length - INITIAL_STREAM_LEADS;
  const hiddenSocialCount = intel.socialItems.length - INITIAL_COMMUNITY_SIGNALS;
  const publicRationale = publicLaunchIntelRationale(
    intel.summary.rationale
  );

  return (
    <section
      ref={regionRef}
      tabIndex={-1}
      aria-labelledby="mission-intelligence-title"
      aria-busy={loading}
      className={`surface-card holo-card signal-cold overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--console-cyan)] ${className}`}
    >
      {offline ? (
        <div
          role="status"
          aria-label="Mission intelligence offline"
          className="flex items-start gap-2 border-b border-[var(--console-amber)]/30 bg-[var(--console-amber)]/[0.06] px-5 py-3 text-sm leading-5 text-[var(--text-secondary)] sm:px-6"
        >
          <AlertTriangle
            aria-hidden="true"
            size={16}
            className="mt-0.5 shrink-0 text-[var(--console-amber)]"
          />
          <p>
            <strong className="font-semibold text-[var(--console-amber)]">
              Device offline.
            </strong>{' '}
            Showing retained coverage signals. Reconnect to verify updates.
          </p>
        </div>
      ) : null}
      <header className="border-b border-[var(--border-subtle)] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="mission-intelligence-title" className="section-title">
              Mission intelligence
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {publicRationale ||
                `Verified public signals associated with ${launch.name}.`}
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="data-label">Updated</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {formatPublishedAt(intel.summary.lastUpdated)}
            </p>
          </div>
        </div>

        {intel.summary.recommendedUrl ? (
          <a
            href={intel.summary.recommendedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              intel.summary.streamState === 'live'
                ? 'action-button action-button-stream mt-4'
                : 'action-button action-button-secondary mt-4'
            }
          >
            {intel.summary.streamState === 'search' ? (
              <Search aria-hidden="true" size={16} />
            ) : (
              <Radio aria-hidden="true" size={16} />
            )}
            {intel.summary.recommendedLabel}
            <ExternalLinkHint />
          </a>
        ) : null}

        <CoverageSignal intel={intel} className="mt-5" />
      </header>

      <div className="grid min-w-0 lg:grid-cols-2">
        <div className="min-w-0 border-b border-[var(--border-subtle)] lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
            <Radio
              aria-hidden="true"
              size={16}
              className="text-[var(--console-magenta)]"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Stream leads
            </h3>
            <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">
              {streamLeads.length}
            </span>
          </div>
          {streamLeads.length ? (
            <>
              <div id={streamListId}>
                {streams.map((candidate) => (
                  <StreamRow key={candidate.id} candidate={candidate} />
                ))}
              </div>
              {hiddenStreamCount > 0 ? (
                <button
                  type="button"
                  aria-expanded={streamsExpanded}
                  aria-controls={streamListId}
                  aria-label={
                    streamsExpanded
                      ? 'Show fewer stream leads'
                      : `Show all ${streamLeads.length} stream leads`
                  }
                  onClick={() =>
                    setExpandedSignals((current) => ({
                      launchId: launch.id,
                      social:
                        current.launchId === launch.id && current.social,
                      streams:
                        current.launchId === launch.id
                          ? !current.streams
                          : true,
                    }))
                  }
                  className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-[var(--border-subtle)] px-4 py-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                >
                  {streamsExpanded
                    ? 'Show fewer leads'
                    : `Reveal ${hiddenStreamCount} more`}
                  <ChevronDown
                    aria-hidden="true"
                    size={15}
                    className={`transition-transform ${streamsExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              ) : null}
            </>
          ) : (
            <p className="px-4 py-6 text-sm leading-6 text-[var(--text-muted)]">
              No verified broadcast has been ranked yet. Use the search action
              above to check current coverage.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
            <Newspaper
              aria-hidden="true"
              size={16}
              className="text-[var(--console-cyan)]"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Coverage
            </h3>
            <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">
              {news.length}
            </span>
          </div>
          {news.length ? (
            news.map((item) => <NewsRow key={item.id} item={item} />)
          ) : (
            <p className="px-4 py-6 text-sm leading-6 text-[var(--text-muted)]">
              No sufficiently recent mission-specific coverage was found.
            </p>
          )}
        </div>
      </div>

      {social.length ? (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
            <MessageCircle
              aria-hidden="true"
              size={16}
              className="text-[var(--console-amber)]"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Social signals
            </h3>
            <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">
              {intel.socialItems.length}
            </span>
          </div>
          <div id={socialListId} className="grid sm:grid-cols-2">
            {social.map((item) => (
              <SocialRow key={item.id} item={item} />
            ))}
          </div>
          {hiddenSocialCount > 0 ? (
            <button
              type="button"
              aria-expanded={socialExpanded}
              aria-controls={socialListId}
              aria-label={
                socialExpanded
                  ? 'Show fewer social signals'
                  : `Show all ${intel.socialItems.length} social signals`
              }
              onClick={() =>
                setExpandedSignals((current) => ({
                  launchId: launch.id,
                  social:
                    current.launchId === launch.id ? !current.social : true,
                  streams:
                    current.launchId === launch.id && current.streams,
                }))
              }
              className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-[var(--border-subtle)] px-4 py-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
            >
              {socialExpanded
                ? 'Show fewer signals'
                : `Reveal ${hiddenSocialCount} more`}
              <ChevronDown
                aria-hidden="true"
                size={15}
                className={`transition-transform ${socialExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          ) : null}
        </div>
      ) : null}

      <footer
        aria-label="Mission intelligence searches"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border-subtle)] px-3 py-2 sm:px-4"
      >
        <a
          href={intel.quickLinks.youtubeSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
        >
          YouTube search
          <ExternalLinkHint />
        </a>
        <a
          href={intel.quickLinks.redditSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
        >
          Reddit search
          <ExternalLinkHint />
        </a>
        <a
          href={intel.quickLinks.xSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
        >
          X search
          <ExternalLinkHint />
        </a>
      </footer>
    </section>
  );
}
