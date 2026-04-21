'use client';

import { useCountdown } from '@/lib/hooks';

interface CountdownProps {
  targetDate: string;
  className?: string;
  compact?: boolean;
}

function getColorClass(total: number): string {
  const hours = total / (1000 * 60 * 60);
  if (hours <= 0) return 'text-[var(--console-red)]';
  if (hours < 10 / 60) return 'text-[var(--console-red)]';
  if (hours < 1) return 'text-[var(--console-amber)]';
  return 'text-[var(--console-green)]';
}

export default function Countdown({ targetDate, className = '', compact = false }: CountdownProps): React.ReactElement {
  const { days, hours, minutes, seconds, total } = useCountdown(targetDate);

  if (total <= 0) {
    return (
      <div className={`font-[family-name:var(--font-geist-mono)] text-[var(--console-red)] font-bold animate-pulse tracking-wider ${compact ? 'text-sm' : 'text-xl sm:text-2xl'} ${className}`}>
        &gt;&gt; LIFTOFF &lt;&lt;
      </div>
    );
  }

  const dd = String(days).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const colorClass = getColorClass(total);

  if (compact) {
    return (
      <span className={`font-[family-name:var(--font-geist-mono)] ${colorClass} font-bold tabular-nums tracking-wider text-xs sm:text-sm ${className}`} suppressHydrationWarning>
        T-{days > 0 ? `${days}d ${hh}h` : `${hh}:${mm}:${ss}`}
      </span>
    );
  }

  return (
    <div className={`font-[family-name:var(--font-geist-mono)] ${className}`} suppressHydrationWarning>
      <div className={`text-2xl sm:text-3xl lg:text-4xl ${colorClass} font-bold tracking-wider tabular-nums`} suppressHydrationWarning>
        T-{dd}:{hh}:{mm}:<span className="animate-pulse">{ss}</span>
      </div>
      <div className="flex gap-4 mt-1 text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-[family-name:var(--font-geist-mono)]">
        <span className="w-[2ch] text-center ml-[2ch]">dy</span>
        <span className="w-[2ch] text-center">hr</span>
        <span className="w-[2ch] text-center">mn</span>
        <span className="w-[2ch] text-center">sc</span>
      </div>
    </div>
  );
}
