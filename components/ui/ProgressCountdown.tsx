'use client';

import { useCountdown } from '@/lib/hooks';

interface ProgressCountdownProps {
  targetDate: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

function getColorClass(total: number): string {
  const hours = total / (1000 * 60 * 60);
  if (hours <= 0) return 'text-[var(--console-red)]';
  if (hours < 10 / 60) return 'text-[var(--console-red)]';
  if (hours < 1) return 'text-[var(--console-amber)]';
  return 'text-[var(--console-green)]';
}

function getBarColor(total: number): string {
  const hours = total / (1000 * 60 * 60);
  if (hours <= 0) return 'bg-[var(--console-red)]';
  if (hours < 10 / 60) return 'bg-[var(--console-red)]';
  if (hours < 1) return 'bg-[var(--console-amber)]';
  return 'bg-[var(--console-green)]';
}

const sizeStyles = {
  sm: 'text-sm',
  md: 'text-xl sm:text-2xl',
  lg: 'text-3xl sm:text-4xl lg:text-5xl',
};

export default function ProgressCountdown({
  targetDate,
  size = 'md',
  showProgress = true,
  className = '',
}: ProgressCountdownProps): React.ReactElement {
  const { days, hours, minutes, seconds, total } = useCountdown(targetDate);
  const colorClass = getColorClass(total);

  if (total <= 0) {
    return (
      <div className={`font-[family-name:var(--font-geist-mono)] ${className}`}>
        <div className={`${sizeStyles[size]} text-[var(--console-red)] font-bold animate-pulse tracking-wider`}>
          &gt;&gt; LIFTOFF &lt;&lt;
        </div>
      </div>
    );
  }

  const dd = String(days).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  // Progress based on 7-day window
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const progress = Math.max(0, Math.min(100, ((sevenDays - total) / sevenDays) * 100));

  return (
    <div className={`font-[family-name:var(--font-geist-mono)] ${className}`} suppressHydrationWarning>
      <div className={`${sizeStyles[size]} ${colorClass} font-bold tracking-wider tabular-nums`} suppressHydrationWarning>
        T-{dd}:{hh}:{mm}:{ss}
      </div>
      {size !== 'sm' && (
        <div className="flex gap-4 mt-1 text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-[family-name:var(--font-geist-mono)]">
          <span className="w-[2ch] text-center ml-[2ch]">dy</span>
          <span className="w-[2ch] text-center">hr</span>
          <span className="w-[2ch] text-center">mn</span>
          <span className="w-[2ch] text-center">sc</span>
        </div>
      )}
      {showProgress && (
        <div className="mt-2 h-0.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor(total)} transition-all duration-1000 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
