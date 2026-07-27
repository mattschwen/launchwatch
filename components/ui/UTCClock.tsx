'use client';

import { useCurrentTime } from '@/lib/hooks';

interface UTCClockProps {
  showDate?: boolean;
  showLabel?: boolean;
  className?: string;
}

export default function UTCClock({
  showDate = false,
  showLabel = true,
  className = '',
}: UTCClockProps): React.ReactElement {
  const now = useCurrentTime();
  const iso = new Date(now).toISOString();
  const time = iso.slice(11, 19);
  const date = iso.slice(0, 10);

  return (
    <div
      className={`flex items-center gap-2 font-[family-name:var(--font-geist-mono)] ${className}`}
      suppressHydrationWarning
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--console-green)]"
      />
      {showLabel ? <span className="data-label">UTC</span> : null}
      {showDate ? (
        <span className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
          {date}
        </span>
      ) : null}
      <time
        dateTime={iso}
        className="font-mono text-sm font-medium tabular-nums tracking-wider text-[var(--console-green)]"
        suppressHydrationWarning
      >
        {time}
      </time>
    </div>
  );
}
