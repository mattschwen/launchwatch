'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useLaunchData } from '@/lib/contexts';

const BOOT_KEY = 'launchwatch.boot-sequence.v3';
const DISPLAY_TIME_MS = 1800;

export default function MissionBootSequence(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const { launches, loading, error, meta } = useLaunchData();
  const partial = Boolean(meta?.partial);

  useEffect(() => {
    if (loading || error || launches.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let hasSeenBoot = false;
    try {
      hasSeenBoot = window.localStorage.getItem(BOOT_KEY) === 'done';
    } catch {
      // Storage can be unavailable in private/restricted browsing.
    }

    if (prefersReducedMotion || hasSeenBoot) {
      return;
    }

    try {
      window.localStorage.setItem(BOOT_KEY, 'done');
    } catch {
      // The status toast still works when persistence is unavailable.
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    const timeout = window.setTimeout(() => setVisible(false), DISPLAY_TIME_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [error, launches.length, loading]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed right-3 top-[4.25rem] z-[60] w-[min(22rem,calc(100vw-1.5rem))] animate-fade-in sm:right-5 sm:top-[4.75rem]"
    >
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-accent)] bg-[var(--surface-raised)] px-4 py-3 shadow-[var(--shadow-elevated)]">
        <span
          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] ${
            partial
              ? 'text-[var(--console-amber)]'
              : 'text-[var(--console-green)]'
          }`}
        >
          {partial ? (
            <AlertTriangle size={16} aria-hidden="true" />
          ) : (
            <Check size={16} aria-hidden="true" />
          )}
        </span>
        <div role="status" aria-live="polite" className="min-w-0 flex-1">
          <p className="console-label">MISSION CONTROL</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
            {partial
              ? 'Schedule loaded with partial provider data'
              : 'Launch schedule synchronized'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss system status"
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
