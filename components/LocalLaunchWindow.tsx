'use client';

import { useSyncExternalStore } from 'react';
import type { Launch } from '@/lib/types';
import { formatLocalLaunchWindow } from '@/lib/format';

const subscribe = (): (() => void) => () => undefined;

export default function LocalLaunchWindow({
  launch,
}: {
  launch: Pick<Launch, 'date' | 'windowStart' | 'windowEnd'>;
}): React.ReactElement | null {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return null;

  let timeZone: string;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }

  const localWindow = formatLocalLaunchWindow(launch, timeZone);
  if (!localWindow) return null;

  return (
    <span
      role="note"
      aria-label={`Your local launch window ${localWindow}`}
      data-local-launch-window="true"
      className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2"
    >
      <span aria-hidden="true" className="text-[var(--border-strong)]">
        {'//'}
      </span>
      <span className="font-sans text-[0.62rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Your window
      </span>
      <span className="break-words text-[var(--text-secondary)]">
        {localWindow}
      </span>
    </span>
  );
}
