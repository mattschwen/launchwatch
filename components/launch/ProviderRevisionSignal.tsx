'use client';

import { Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCurrentTime } from '@/lib/hooks';

type ProviderRevisionVariant = 'default' | 'compact' | 'hero';

const UTC_REVISION_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const UTC_REVISION_TIME = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

export function getProviderRevisionLabel(
  updatedAt: string,
  now: number,
): string | null {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return null;

  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'Revised just now';
  if (elapsedMinutes < 60) return `Revised ${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 48) return `Revised ${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) return `Revised ${elapsedDays}d ago`;

  return `Revised ${UTC_REVISION_DATE.format(timestamp)}`;
}

function compactHeroRevisionLabel(revisionLabel: string): string {
  if (revisionLabel === 'Revised just now') return 'now';
  const boundedAge = revisionLabel.match(/^Revised (\d+[mhd]) ago$/);
  return boundedAge?.[1] ?? '30d+';
}

function absoluteRevisionTime(timestamp: number): string {
  return `${UTC_REVISION_DATE.format(timestamp)} · ${UTC_REVISION_TIME.format(timestamp)} UTC`;
}

export default function ProviderRevisionSignal({
  updatedAt,
  variant = 'default',
}: {
  updatedAt: string | null | undefined;
  variant?: ProviderRevisionVariant;
}): React.ReactElement | null {
  const liveNow = useCurrentTime();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const normalizedUpdatedAt = typeof updatedAt === 'string' ? updatedAt : null;
  const timestamp = normalizedUpdatedAt
    ? Date.parse(normalizedUpdatedAt)
    : Number.NaN;
  const revisionLabel = normalizedUpdatedAt
    ? getProviderRevisionLabel(
        normalizedUpdatedAt,
        hydrated ? liveNow : timestamp,
      )
    : null;

  if (!normalizedUpdatedAt || !revisionLabel || !Number.isFinite(timestamp)) {
    return null;
  }

  const absoluteTime = absoluteRevisionTime(timestamp);
  if (variant === 'hero') {
    const compactRevisionLabel = compactHeroRevisionLabel(revisionLabel);
    return (
      <dd
        data-provider-revision-signal
        className="provider-revision-hero absolute right-3 top-0 flex min-w-0 max-w-[calc(100%-5.5rem)] items-center gap-1 font-mono text-[0.68rem] leading-4 text-[var(--text-secondary)]"
      >
        <Clock3
          aria-hidden="true"
          size={13}
          className="shrink-0 text-[var(--console-cyan)]"
        />
        <time
          dateTime={normalizedUpdatedAt}
          title={absoluteTime}
          suppressHydrationWarning
          className="truncate"
        >
          <span className="sr-only">Provider revision age: </span>
          {compactRevisionLabel}
        </time>
      </dd>
    );
  }

  const compact = variant === 'compact';
  return (
    <div
      data-provider-revision-signal
      className={compact ? 'mission-telemetry-item relative pl-8' : 'py-4'}
    >
      <dt className="flex items-center gap-3">
        <Clock3
          aria-hidden="true"
          size={18}
          className={`${compact ? 'absolute left-0 top-0.5' : ''} shrink-0 text-[var(--console-cyan)]`}
        />
        <span className="data-label">Provider revision</span>
      </dt>
      <dd
        className={`${compact ? 'mt-1' : 'mt-1 pl-[1.875rem]'} min-w-0 text-sm text-[var(--text-primary)]`}
      >
        <time
          dateTime={normalizedUpdatedAt}
          suppressHydrationWarning
          className="block font-medium"
        >
          {revisionLabel}
        </time>
        <span className="mt-1 block break-words font-mono text-xs leading-5 text-[var(--text-muted)]">
          {absoluteTime}
        </span>
      </dd>
    </div>
  );
}
