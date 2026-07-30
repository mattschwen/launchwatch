import {
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  Newspaper,
  Radio,
} from 'lucide-react';
import CoverageSignal from './CoverageSignal';
import type {
  Launch,
  LaunchIntel,
  LaunchNewsItem,
  LaunchSocialItem,
  LaunchStreamCandidate,
} from '@/lib/types';

interface LaunchIntelDeckProps {
  launch: Launch;
  intel: LaunchIntel | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
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
      className="group flex min-h-[4.25rem] items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 transition-colors last:border-0 hover:bg-[var(--surface-subtle)]"
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          candidate.liveStatus === 'live'
            ? 'status-dot-live bg-[var(--console-magenta)]'
            : candidate.confidence === 'high'
              ? 'bg-[var(--console-green)]'
              : 'bg-[var(--console-amber)]'
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--console-cyan)]">
          {candidate.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
          {candidate.channelTitle || 'Provider stream'} · {candidate.confidence}{' '}
          confidence
        </span>
      </span>
      <ExternalLink
        aria-hidden="true"
        size={15}
        className="shrink-0 text-[var(--text-muted)]"
      />
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
    </a>
  );
}

function SocialRow({ item }: { item: LaunchSocialItem }): React.ReactElement {
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
    </a>
  );
}

export default function LaunchIntelDeck({
  launch,
  intel,
  loading = false,
  error = null,
  className = '',
}: LaunchIntelDeckProps): React.ReactElement {
  if (loading && !intel) {
    return (
      <section
        aria-label="Loading mission intelligence"
        className={`surface-card holo-card signal-cold p-5 ${className}`}
      >
        <div className="skeleton h-7 w-56 rounded" />
        <div className="skeleton mt-5 h-16 rounded" />
        <div className="skeleton mt-3 h-16 rounded" />
        <div className="skeleton mt-3 h-16 rounded" />
      </section>
    );
  }

  if (!intel) {
    return (
      <section
        aria-labelledby="mission-intelligence-title"
        className={`surface-card holo-card ${
          error ? 'signal-warm' : 'signal-cold'
        } p-5 sm:p-6 ${className}`}
      >
        <div className="flex items-start gap-3">
          {error ? (
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
            {error ? (
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
                No verified stream, coverage, or community signal is available
                for this mission yet. Official provider links remain the source
                of truth.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  const streams = intel.streamCandidates.slice(0, 4);
  const news = intel.newsItems.slice(0, 5);
  const social = intel.socialItems.slice(0, 4);

  return (
    <section
      aria-labelledby="mission-intelligence-title"
      className={`surface-card holo-card signal-cold overflow-hidden ${className}`}
    >
      <header className="border-b border-[var(--border-subtle)] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="mission-intelligence-title" className="section-title">
              Mission intelligence
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {intel.summary.rationale ||
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
            <Radio aria-hidden="true" size={16} />
            {intel.summary.recommendedLabel}
          </a>
        ) : null}

        <CoverageSignal intel={intel} className="mt-5" />
      </header>

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-[var(--border-subtle)] lg:border-b-0 lg:border-r">
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
              {streams.length}
            </span>
          </div>
          {streams.length ? (
            streams.map((candidate) => (
              <StreamRow key={candidate.id} candidate={candidate} />
            ))
          ) : (
            <p className="px-4 py-6 text-sm leading-6 text-[var(--text-muted)]">
              No verified broadcast has been ranked yet.
            </p>
          )}
        </div>

        <div>
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
              Community signal
            </h3>
            <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">
              {social.length}
            </span>
          </div>
          <div className="grid sm:grid-cols-2">
            {social.map((item) => (
              <SocialRow key={item.id} item={item} />
            ))}
          </div>
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
        </a>
        <a
          href={intel.quickLinks.redditSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
        >
          Reddit search
        </a>
        <a
          href={intel.quickLinks.xSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--console-cyan)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
        >
          X search
        </a>
      </footer>
    </section>
  );
}
