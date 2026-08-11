'use client';

import { useSyncExternalStore } from 'react';
import type { Launch } from '@/lib/types';
import { formatLocalLaunchTime, normalizeTimeZone } from '@/lib/format';
import LocalLaunchTime from '@/components/LocalLaunchTime';

const subscribe = (): (() => void) => () => undefined;

export default function LaunchTimeContext({
  launch,
  className = '',
  as = 'span',
}: {
  launch: Pick<Launch, 'date' | 'datePrecision' | 'location'>;
  className?: string;
  as?: 'dd' | 'span';
}): React.ReactElement | null {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const siteTimeZone = normalizeTimeZone(launch.location?.timeZone);
  const siteTime = hydrated && siteTimeZone
    ? formatLocalLaunchTime(
        launch.date,
        launch.datePrecision,
        siteTimeZone,
      )
    : null;
  const Tag = as;

  return (
    <>
      {siteTime ? (
        <Tag
          data-launch-site-time="true"
          className={`launch-site-time flex min-w-0 flex-wrap items-baseline gap-x-1.5 ${className}`}
        >
          <span className="font-sans text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Site time
          </span>
          <time dateTime={launch.date}>{siteTime}</time>
        </Tag>
      ) : null}
      <LocalLaunchTime
        as={as}
        date={launch.date}
        precision={launch.datePrecision}
        excludeTimeZone={siteTimeZone}
        className={className}
      />
    </>
  );
}
