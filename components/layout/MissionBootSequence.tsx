'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useLaunchData } from '@/lib/contexts';

const BOOT_KEY = 'launchwatch.boot-sequence.v3';
const DISPLAY_TIME_MS = 6000;

export default function MissionBootSequence(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const statusRef = useRef<HTMLElement>(null);
  const focusFrameRef = useRef<number | null>(null);
  const { launches, loading, error, meta } = useLaunchData();
  const partial = Boolean(meta?.partial);
  const stale = Boolean(meta?.stale);

  useEffect(() => {
    if (loading || error || launches.length === 0) return;

    let hasSeenBoot = false;
    try {
      hasSeenBoot = window.localStorage.getItem(BOOT_KEY) === 'done';
    } catch {
      // Storage can be unavailable in private/restricted browsing.
    }

    if (hasSeenBoot) {
      return;
    }

    try {
      window.localStorage.setItem(BOOT_KEY, 'done');
    } catch {
      // The status toast still works when persistence is unavailable.
    }
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.dataset.bootStatus = 'visible';
      setVisible(true);
    });
    const timeout = window.setTimeout(() => {
      const restoreFocus = statusRef.current?.contains(document.activeElement);
      delete document.documentElement.dataset.bootStatus;
      setVisible(false);
      if (restoreFocus) {
        focusFrameRef.current = window.requestAnimationFrame(() => {
          focusFrameRef.current = null;
          document.getElementById('main-content')?.focus({ preventScroll: true });
        });
      }
    }, DISPLAY_TIME_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      delete document.documentElement.dataset.bootStatus;
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, [error, launches.length, loading]);

  if (!visible) {
    return null;
  }

  const compactMessage = stale
    ? 'Retained'
    : partial
      ? 'Partial'
      : 'Synced';
  const mobileMessage = stale
    ? 'Retained schedule'
    : partial
      ? 'Partial schedule'
      : 'Schedule synced';
  const message = stale
    ? 'Retained provider schedule loaded'
    : partial
      ? 'Partial provider schedule loaded'
      : 'Launch schedule synchronized';

  const dismiss = (): void => {
    delete document.documentElement.dataset.bootStatus;
    setVisible(false);
    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusFrameRef.current = null;
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
  };

  return (
    <aside
      ref={statusRef}
      aria-label="MISSION CONTROL"
      aria-describedby="mission-sync-message"
      className="fixed right-[max(0.75rem,var(--safe-area-right))] top-[calc(0.375rem+var(--safe-area-top))] z-[60] flex h-11 min-w-0 max-w-[13rem] animate-fade-in items-center rounded-[var(--radius-sm)] border border-[var(--border-accent)] bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)] sm:right-[max(1.25rem,var(--safe-area-right))] sm:top-[calc(0.8125rem+var(--safe-area-top))] sm:max-w-[17rem] lg:max-w-[22rem]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-2 sm:gap-3 sm:pl-3">
        <span
          className={`hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] sm:inline-flex ${
            partial || stale
              ? 'text-[var(--console-amber)]'
              : 'text-[var(--console-green)]'
          }`}
        >
          {partial || stale ? (
            <AlertTriangle size={16} aria-hidden="true" />
          ) : (
            <Check size={16} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p id="mission-sync-title" className="console-label hidden lg:block">
            MISSION CONTROL
          </p>
          <p
            id="mission-sync-message"
            role="status"
            aria-label={message}
            aria-live="polite"
            aria-atomic="true"
            className="truncate text-xs font-medium text-[var(--text-primary)] sm:text-sm lg:mt-0.5"
          >
            <span
              className="mission-boot-message-mobile max-[359px]:hidden lg:hidden"
              aria-hidden="true"
            >
              {mobileMessage}
            </span>
            <span
              className="mission-boot-message-compact min-[360px]:hidden"
              aria-hidden="true"
            >
              {compactMessage}
            </span>
            <span
              className="mission-boot-message-full hidden lg:inline"
              aria-hidden="true"
            >
              {message}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss system status"
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
