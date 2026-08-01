'use client';

import { useId, useState } from 'react';
import { ChevronDown, ImageIcon } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  launchVisualSubject,
  selectLaunchVisual,
} from '@/lib/launch-visual';
import MissionVisual from './MissionVisual';

export default function MissionVisualDisclosure({
  launch,
  loading,
  error,
  className = '',
}: {
  launch: Launch;
  loading: boolean;
  error: string | null;
  className?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const selection = selectLaunchVisual(launch);
  const available = selection.status === 'available';
  const archiveLabel = available
    ? 'Licensed mission visual'
    : loading
      ? 'Visual verification'
      : 'Mission visual archive';
  const summary = loading && !available
    ? 'Checking the mission record for reusable imagery'
    : available
      ? launchVisualSubject(launch, selection.visual)
      : error
        ? 'Visual source temporarily unavailable'
        : selection.status === 'rights-unverified'
          ? 'Usage rights could not be verified'
          : 'No reusable visual supplied';

  return (
    <section
      aria-label="Mission visual archive"
      className={`surface-card holo-card max-w-xl overflow-hidden ${
        !loading && !available ? 'signal-warm' : 'signal-cold'
      } ${className}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        aria-label={`${open ? 'Hide' : 'Show'} mission visual for ${launch.name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-subtle)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--console-cyan)]">
          <ImageIcon aria-hidden="true" size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="data-label block text-[var(--console-cyan)]">
            {archiveLabel}
          </span>
          <span className="mt-1 block break-words text-sm font-semibold leading-5 text-[var(--text-primary)]">
            {summary}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--console-cyan)]">
          {open ? 'Hide' : 'Show'}
          <ChevronDown
            aria-hidden="true"
            size={16}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      <div id={regionId} hidden={!open}>
        {open ? (
          <MissionVisual
            launch={launch}
            compact
            loading={loading}
            error={error}
            showUnavailableState
            className="max-w-none rounded-none border-x-0 border-b-0"
          />
        ) : null}
      </div>
    </section>
  );
}
