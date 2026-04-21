'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [time, setTime] = useState<string>('--:--:--');
  const [date, setDate] = useState<string>('');
  const started = useRef(false);

  useEffect(() => {
    function tick(): void {
      const now = new Date();
      setTime(now.toISOString().slice(11, 19));
      if (showDate) {
        setDate(now.toISOString().slice(0, 10));
      }
    }

    tick();
    started.current = true;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [showDate]);

  return (
    <div className={`flex items-center gap-2 font-[family-name:var(--font-geist-mono)] ${className}`} suppressHydrationWarning>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--console-green)] animate-blink" />
      {showLabel && (
        <span className="console-label text-[10px]">UTC</span>
      )}
      {showDate && date && (
        <span className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>{date}</span>
      )}
      <span className="text-sm text-[var(--console-green)] tabular-nums tracking-wider font-medium" suppressHydrationWarning>
        {time}
      </span>
    </div>
  );
}
