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
  const descriptionId = useId();
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
    const result = await shareMission(launch, window.location.origin);
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
        <p
          id={descriptionId}
          role="status"
          className="basis-full text-xs leading-5 text-[var(--console-red)]"
        >
          Sharing is unavailable. Copy the page address from your browser.
        </p>
      ) : null}
    </div>
  );
}
