'use client';

import { useSyncExternalStore } from 'react';
import type { LaunchDatePrecision } from '@/lib/types';
import { formatLocalLaunchTime } from '@/lib/format';

const subscribe = (): (() => void) => () => undefined;

export default function LocalLaunchTime({
  date,
  precision,
  className = '',
  as = 'span',
}: {
  date: string;
  precision?: LaunchDatePrecision | null;
  className?: string;
  as?: 'dd' | 'span';
}): React.ReactElement | null {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return null;

  let timeZone: string;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }

  const localTime = formatLocalLaunchTime(date, precision, timeZone);
  if (!localTime) return null;
  const Tag = as;

  return (
    <Tag
      className={`local-launch-time flex min-w-0 flex-wrap items-baseline gap-x-1.5 ${className}`}
    >
      <span className="font-sans text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Your time
      </span>
      <time dateTime={date}>{localTime}</time>
    </Tag>
  );
}
