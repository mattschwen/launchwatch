import { getLaunchLiveSignal } from '@/lib/format';
import type { Launch } from '@/lib/types';

export function getWatchDocumentTitle(
  launch: Pick<Launch, 'isLive' | 'name' | 'statusName'>,
  coverageUnconfirmed: boolean,
): string {
  if (launch.isLive && coverageUnconfirmed) {
    return `LAST KNOWN · ${launch.name} | Watch | LaunchWatch`;
  }

  const liveSignal = getLaunchLiveSignal(launch);
  if (liveSignal === 'mission') {
    return `IN FLIGHT · ${launch.name} | LaunchWatch`;
  }
  if (liveSignal === 'coverage') {
    return `COVERAGE LIVE · ${launch.name} | LaunchWatch`;
  }

  return `${launch.name} | Watch | LaunchWatch`;
}
