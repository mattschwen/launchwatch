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
      <div className={`text-2xl font-bold text-red-500 animate-pulse ${className}`}>
        LAUNCHING NOW! 🚀
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${className}`}>
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold text-white">{timeLeft.days}</div>
          <div className="text-sm text-gray-400">days</div>
        </div>
      )}
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
        <div className="text-sm text-gray-400">hours</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
        <div className="text-sm text-gray-400">minutes</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-4xl font-bold text-white animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</div>
        <div className="text-sm text-gray-400">seconds</div>
      </div>
    </div>
  );
}
