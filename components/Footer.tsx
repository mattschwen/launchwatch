'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import { useCurrentTime, useLaunches } from '@/lib/hooks';
import { getFeedHealth } from '@/lib/feed-health';

function providerStatus(meta: unknown, pending: boolean): {
  label: string;
  className: string;
  dotClassName: string;
} {
  if (pending) {
    return {
      label: 'syncing',
      className: 'text-[var(--console-cyan)]',
      dotClassName: 'bg-[var(--console-cyan)]',
    };
  }

  const state =
    meta && typeof meta === 'object' && !Array.isArray(meta)
      ? (meta as Record<string, unknown>).state
      : null;

  if (state === 'error') {
    return {
      label: 'unavailable',
      className: 'text-[var(--console-red)]',
      dotClassName: 'bg-[var(--console-red)]',
    };
  }

  if (state === 'stale') {
    return {
      label: 'stale',
      className: 'text-[var(--console-amber)]',
      dotClassName: 'bg-[var(--console-amber)]',
    };
  }

  if (state === 'not-requested') {
    return {
      label: 'standby',
      className: 'text-[var(--text-muted)]',
      dotClassName: 'bg-[var(--text-muted)]',
    };
  }

  return state === 'ok'
    ? {
        label: 'available',
        className: 'text-[var(--console-green)]',
        dotClassName: 'bg-[var(--console-green)]',
      }
    : {
        label: 'unknown',
        className: 'text-[var(--text-muted)]',
        dotClassName: 'bg-[var(--text-muted)]',
      };
}

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
  const providers =
    meta?.providers && !Array.isArray(meta.providers)
      ? meta.providers
      : null;
  const spacexStatus = providerStatus(providers?.spacex, !meta);
  const ll2Status = providerStatus(providers?.ll2, !meta);
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
              aria-label={`SpaceX source — ${spacexStatus.label}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--console-cyan)]"
            >
              <span>SpaceX</span>
              <span
                aria-hidden="true"
                className={`inline-flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${spacexStatus.className}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${spacexStatus.dotClassName}`}
                />
                {spacexStatus.label}
              </span>
              <ExternalLink aria-hidden="true" size={12} />
            </a>
            <a
              href="https://thespacedevs.com/llapi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Launch Library 2 source — ${ll2Status.label}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--console-cyan)]"
            >
              <span>Launch Library 2</span>
              <span
                aria-hidden="true"
                className={`inline-flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${ll2Status.className}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${ll2Status.dotClassName}`}
                />
                {ll2Status.label}
              </span>
              <ExternalLink aria-hidden="true" size={12} />
            </a>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span
            className={`font-mono ${statusClass}`}
          >
            <span className="sr-only">{statusAnnouncement}. </span>
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
