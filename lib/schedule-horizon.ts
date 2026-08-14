import { hasDayOrBetterLaunchTime } from '@/lib/format';
import type { Launch } from '@/lib/types';

export const NEAR_TERM_HORIZON_DAYS = 7;
const DAY_MS = 86_400_000;

export function isNearTermLaunch(
  launch: Pick<Launch, 'date' | 'datePrecision' | 'isLive' | 'status'>,
  referenceTime: number,
): boolean {
  if (!Number.isFinite(referenceTime)) return false;
  if (launch.isLive || launch.status === 'live') return true;
  if (!hasDayOrBetterLaunchTime(launch.datePrecision)) return false;

  const targetTime = new Date(launch.date).getTime();
  if (!Number.isFinite(targetTime)) return false;

  const currentUtcDay = new Date(referenceTime);
  currentUtcDay.setUTCHours(0, 0, 0, 0);

  return (
    targetTime >= currentUtcDay.getTime() &&
    targetTime <= referenceTime + NEAR_TERM_HORIZON_DAYS * DAY_MS
  );
}
