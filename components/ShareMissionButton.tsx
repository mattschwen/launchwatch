'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  Check,
  CircleAlert,
  Copy,
  LoaderCircle,
  Share2,
} from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  getCanonicalLaunchUrl,
  shareMission,
  type MissionShareResult,
} from '@/lib/share';

type ShareState = 'idle' | 'sharing' | Exclude<MissionShareResult, 'cancelled'>;

export default function ShareMissionButton({
  launch,
  compact = false,
}: {
  launch: Launch;
  compact?: boolean;
}): React.ReactElement {
  const [state, setState] = useState<ShareState>('idle');
  const [manualUrl, setManualUrl] = useState('');
  const descriptionId = useId();
  const manualLinkId = useId();
  const resetTimeoutRef = useRef<number | undefined>(undefined);
  const sharing = state === 'sharing';
  const error = state === 'error';
  const label =
    state === 'sharing'
      ? 'Sharing mission'
      : state === 'shared'
        ? 'Mission shared'
        : state === 'copied'
          ? 'Link copied'
          : state === 'error'
            ? 'Retry share'
            : compact
              ? 'Share'
              : 'Share mission';

  useEffect(
    () => () => {
      if (resetTimeoutRef.current !== undefined) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    },
    []
  );

  const handleShare = async (): Promise<void> => {
    if (sharing) return;

    if (resetTimeoutRef.current !== undefined) {
      window.clearTimeout(resetTimeoutRef.current);
    }
    setState('sharing');
    const origin = window.location.origin;
    const result = await shareMission(launch, origin);
    if (result === 'error') {
      setManualUrl(getCanonicalLaunchUrl(launch.id, origin));
    }
    setState(result === 'cancelled' ? 'idle' : result);
    if (result === 'shared' || result === 'copied') {
      resetTimeoutRef.current = window.setTimeout(() => setState('idle'), 2200);
    }
  };

  return (
    <div className="contents">
      <button
        type="button"
        onClick={() => void handleShare()}
        aria-busy={sharing}
        aria-disabled={sharing}
        aria-describedby={error ? descriptionId : undefined}
        className={`action-button action-button-secondary aria-disabled:cursor-wait aria-disabled:opacity-60 ${
          error ? 'text-[var(--console-red)]' : ''
        }`}
      >
        {sharing ? (
          <LoaderCircle aria-hidden="true" size={17} className="animate-spin" />
        ) : state === 'shared' ? (
          <Check
            aria-hidden="true"
            size={17}
            className="text-[var(--console-green)]"
          />
        ) : state === 'copied' ? (
          <Copy
            aria-hidden="true"
            size={17}
            className="text-[var(--console-cyan)]"
          />
        ) : error ? (
          <CircleAlert aria-hidden="true" size={17} />
        ) : (
          <Share2 aria-hidden="true" size={17} />
        )}
        {label}
      </button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {state === 'shared'
          ? `${launch.name} shared.`
          : state === 'copied'
            ? 'Canonical mission link copied to clipboard.'
            : ''}
      </span>
      {error ? (
        <div
          data-share-recovery="true"
          className="share-recovery col-span-full min-w-0 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-amber)_32%,var(--border-subtle))] bg-[var(--surface-accent)] p-3"
        >
          <label
            htmlFor={manualLinkId}
            className="data-label text-[var(--console-amber)]"
          >
            Canonical mission link
          </label>
          <p
            id={descriptionId}
            role="status"
            className="mt-1 text-xs leading-5 text-[var(--text-secondary)]"
          >
            Automatic sharing is unavailable. Select and copy the canonical
            link below.
          </p>
          <input
            id={manualLinkId}
            type="url"
            readOnly
            spellCheck={false}
            value={manualUrl}
            aria-describedby={descriptionId}
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.currentTarget.select()}
            className="mt-3 min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-base)] px-3 font-mono text-xs text-[var(--console-cyan)] outline-none selection:bg-[var(--console-cyan)] selection:text-black focus-visible:border-[var(--console-cyan)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--console-cyan)_34%,transparent)]"
          />
        </div>
      ) : null}
    </div>
  );
}
