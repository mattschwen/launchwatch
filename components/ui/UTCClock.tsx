'use client';

import { useCurrentTime } from '@/lib/hooks';

interface UTCClockProps {
  showDate?: boolean;
  compact?: boolean;
  showLabel?: boolean;
  showIndicator?: boolean;
  className?: string;
}

export default function UTCClock({
  showDate = false,
  compact = false,
  showLabel = true,
  showIndicator = true,
  className = '',
}: UTCClockProps): React.ReactElement {
  const now = useCurrentTime();
  const iso = new Date(now).toISOString();
  const time = iso.slice(11, 19);
  const visibleTime = compact ? `${time.slice(0, 5)}Z` : time;
  const date = iso.slice(0, 10);

  return (
    <div
      data-compact={compact ? 'true' : undefined}
      className={`flex items-center gap-2 font-[family-name:var(--font-geist-mono)] ${className}`}
      suppressHydrationWarning
    >
      {showIndicator ? (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--console-green)]"
        />
      ) : null}
      {showLabel ? <span className="data-label">UTC</span> : null}
      {showDate ? (
        <span className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
          {date}
        </span>
      ) : null}
      <time
        dateTime={iso}
        aria-label={`Current UTC time ${time}`}
        className="font-mono text-sm font-medium tabular-nums tracking-wider text-[var(--console-green)]"
        suppressHydrationWarning
      >
        {visibleTime}
      </time>
    </div>
  );
}
