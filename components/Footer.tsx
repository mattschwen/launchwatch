'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import { useCurrentTime, useLaunches } from '@/lib/hooks';

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
  const { refreshing, error, meta, refresh } = useLaunches();
  const now = useCurrentTime();

  return (
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface-base)]">
      <div className="page-container flex min-h-14 flex-col gap-3 py-3 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          All times UTC. Sources:{' '}
          <a
            href="https://github.com/r-spacex/SpaceX-API"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-secondary)] hover:text-[var(--console-cyan)]"
          >
            SpaceX
          </a>{' '}
          and{' '}
          <a
            href="https://thespacedevs.com/llapi"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-secondary)] hover:text-[var(--console-cyan)]"
          >
            Launch Library 2
          </a>
          . Times can change.
        </p>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span aria-live="polite" className="font-mono">
            {error ? 'Feed degraded' : `Data refresh: ${refreshAge(meta?.generatedAt, now)}`}
          </span>
          <span
            aria-hidden="true"
            className="hidden h-5 w-px bg-[var(--border-subtle)] sm:block"
          />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center gap-2 font-medium text-[var(--console-cyan)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-60"
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
