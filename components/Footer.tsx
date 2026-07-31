'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import { useCurrentTime, useLaunches } from '@/lib/hooks';
import { getFeedHealth } from '@/lib/feed-health';

function refreshAge(generatedAt: string | undefined, now: number): string {
  if (!generatedAt) return 'pending';
  const timestamp = new Date(generatedAt).getTime();
  if (!Number.isFinite(timestamp)) return 'unknown';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function Footer(): React.ReactElement {
  const { launches, loading, refreshing, error, meta, refresh } = useLaunches();
  const now = useCurrentTime();
  const feedHealth = getFeedHealth({
    hasLaunches: launches.length > 0,
    loading,
    refreshing,
    error,
    partial: Boolean(meta?.partial),
    stale: Boolean(meta?.stale),
  });
  const age = refreshAge(meta?.generatedAt, now);
  const statusLabel =
    feedHealth === 'offline'
      ? 'Feed offline'
      : feedHealth === 'syncing'
        ? 'Syncing feed'
        : feedHealth === 'refreshing'
          ? age === 'pending'
            ? 'Refreshing feed'
            : `Refreshing feed · last update ${age}`
          : feedHealth === 'stale'
            ? `Stale feed · refreshed ${age}`
            : feedHealth === 'partial'
              ? `Partial feed · refreshed ${age}`
              : `Data refresh: ${age}`;
  const statusAnnouncement =
    feedHealth === 'offline'
      ? 'Launch feed is offline'
      : feedHealth === 'syncing'
        ? 'Synchronizing launch feed'
        : feedHealth === 'refreshing'
          ? 'Refreshing launch feed'
          : feedHealth === 'stale'
            ? 'Launch feed is stale'
            : feedHealth === 'partial'
              ? 'Launch feed is partial'
              : 'Launch feed is current';
  const statusClass =
    feedHealth === 'offline'
      ? 'text-[var(--console-red)]'
      : feedHealth === 'stale' || feedHealth === 'partial'
        ? 'text-[var(--console-amber)]'
        : feedHealth === 'syncing' || feedHealth === 'refreshing'
          ? 'text-[var(--console-cyan)]'
          : '';

  return (
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface-base)] pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <div className="page-container flex min-h-14 flex-col gap-3 py-3 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="leading-5">All times UTC. Schedule times can change.</p>
          <nav
            aria-label="Launch data sources"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="data-label mr-0.5">Source feeds</span>
            <a
              href="https://github.com/r-spacex/SpaceX-API"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--console-cyan)]"
            >
              SpaceX
              <ExternalLink aria-hidden="true" size={12} />
            </a>
            <a
              href="https://thespacedevs.com/llapi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--console-cyan)]"
            >
              Launch Library 2
              <ExternalLink aria-hidden="true" size={12} />
            </a>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={statusAnnouncement}
            className={`font-mono ${statusClass}`}
          >
            <span aria-hidden="true">{statusLabel}</span>
          </span>
          <span
            aria-hidden="true"
            className="hidden h-5 w-px bg-[var(--border-subtle)] sm:block"
          />
          <button
            type="button"
            onClick={() => {
              if (!refreshing) void refresh();
            }}
            aria-disabled={refreshing}
            aria-busy={refreshing}
            className="inline-flex min-h-11 items-center gap-2 font-medium text-[var(--console-cyan)] transition-colors hover:text-[var(--text-primary)] aria-disabled:cursor-wait aria-disabled:opacity-60"
          >
            <RefreshCw
              aria-hidden="true"
              size={15}
              className={refreshing ? 'animate-spin' : ''}
            />
            {refreshing ? 'Refreshing' : 'Refresh now'}
          </button>
          <a
            href="https://github.com/mattschwen/launchwatch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-medium text-[var(--text-secondary)] hover:text-[var(--console-cyan)]"
          >
            Source
            <ExternalLink aria-hidden="true" size={13} />
          </a>
        </div>
      </div>
    </footer>
  );
}
