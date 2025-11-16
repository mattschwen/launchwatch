'use client';

import { useCountdown } from '@/lib/hooks';

interface CountdownProps {
  targetDate: string;
  className?: string;
}

export default function Countdown({ targetDate, className = '' }: CountdownProps) {
  const timeLeft = useCountdown(targetDate);

  if (timeLeft.total <= 0) {
    return (
      <div className={`text-lg font-bold text-[var(--live)] animate-pulse flex items-center gap-2 ${className}`}>
        <span>LAUNCHING NOW! 🚀</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {timeLeft.days > 0 && (
        <div className="glass rounded-lg p-2 flex flex-col items-center min-w-[60px]">
          <div className="text-2xl font-bold gradient-text">{timeLeft.days}</div>
          <div className="text-xs text-[var(--text-muted)]">days</div>
        </div>
      )}
      <div className="glass rounded-lg p-2 flex flex-col items-center min-w-[60px]">
        <div className="text-2xl font-bold gradient-text">{String(timeLeft.hours).padStart(2, '0')}</div>
        <div className="text-xs text-[var(--text-muted)]">hrs</div>
      </div>
      <div className="glass rounded-lg p-2 flex flex-col items-center min-w-[60px]">
        <div className="text-2xl font-bold gradient-text">{String(timeLeft.minutes).padStart(2, '0')}</div>
        <div className="text-xs text-[var(--text-muted)]">min</div>
      </div>
      <div className="glass rounded-lg p-2 flex flex-col items-center min-w-[60px]">
        <div className="text-2xl font-bold text-[var(--primary)] animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</div>
        <div className="text-xs text-[var(--text-muted)]">sec</div>
      </div>
    </div>
  );
}
