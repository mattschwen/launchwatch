'use client';

import Countdown from '@/components/Countdown';
import type { LaunchDatePrecision } from '@/lib/types';

interface ProgressCountdownProps {
  targetDate: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
  precision?: LaunchDatePrecision | null;
}

const sizeClass = {
  sm: '[&>span:first-child]:!text-xl',
  md: '[&>span:first-child]:!text-[clamp(1.8rem,4vw,3rem)]',
  lg: '',
};

export default function ProgressCountdown({
  targetDate,
  size = 'md',
  className = '',
  precision = null,
}: ProgressCountdownProps): React.ReactElement {
  return (
    <Countdown
      targetDate={targetDate}
      precision={precision}
      className={`${sizeClass[size]} ${className}`}
    />
  );
}
