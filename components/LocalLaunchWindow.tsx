'use client';

import { useState, useSyncExternalStore } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  formatLocalLaunchWindow,
  normalizeTimeZone,
} from '@/lib/format';

const subscribe = (): (() => void) => () => undefined;

export default function LocalLaunchWindow({
  launch,
}: {
  launch: Pick<
    Launch,
    'date' | 'windowStart' | 'windowEnd' | 'location'
  >;
}): React.ReactElement | null {
  const [siteSelected, setSiteSelected] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return null;

  let viewerTimeZone: string;
  try {
    viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }

  const siteTimeZone = normalizeTimeZone(launch.location?.timeZone);
  const siteWindow = siteTimeZone
    ? formatLocalLaunchWindow(launch, siteTimeZone)
    : null;
  const viewerWindowCandidate = formatLocalLaunchWindow(
    launch,
    viewerTimeZone,
  );
  const viewerWindow =
    viewerWindowCandidate === siteWindow ? null : viewerWindowCandidate;

  if (!siteWindow && !viewerWindow) return null;

  const canSwitch = Boolean(siteWindow && viewerWindow);
  const showingSite = Boolean(siteWindow && (!viewerWindow || siteSelected));
  const activeWindow = showingSite ? siteWindow : viewerWindow;
  if (!activeWindow) return null;
  const activeLabel = showingSite ? 'Site window' : 'Your window';
  const alternateLabel = showingSite ? 'your window' : 'launch site window';
  const alternateWindow = showingSite ? viewerWindow : siteWindow;

  return (
    <span
      role="note"
      aria-live="polite"
      aria-label={`${activeLabel} ${activeWindow}`}
      data-launch-site-window={showingSite ? 'true' : undefined}
      data-local-launch-window={!showingSite ? 'true' : undefined}
      className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
    >
      <span aria-hidden="true" className="text-[var(--border-strong)]">
        {'//'}
      </span>
      {canSwitch ? (
        <button
          type="button"
          aria-label={`Show ${alternateLabel} ${alternateWindow}`}
          aria-pressed={showingSite}
          onClick={() => setSiteSelected((selected) => !selected)}
          className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] px-1 font-sans text-[0.62rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--console-cyan)] focus-visible:text-[var(--console-cyan)] min-[360px]:-my-3.5"
        >
          {activeLabel}
          <ArrowLeftRight aria-hidden="true" size={11} />
        </button>
      ) : (
        <span className="font-sans text-[0.62rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {activeLabel}
        </span>
      )}
      <span className="break-words text-[var(--text-secondary)]">
        {activeWindow}
      </span>
    </span>
  );
}
