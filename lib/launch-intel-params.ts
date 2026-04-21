import { Launch } from './types';

export function serializeLaunchForIntel(launch: Launch): string {
  const params = new URLSearchParams({
    id: launch.id,
    name: launch.name,
    date: launch.date,
    dateUnix: String(launch.dateUnix),
    rocket: launch.rocket,
    launchSite: launch.launchSite,
    status: launch.status,
    isLive: String(launch.isLive),
    source: launch.source,
  });

  if (launch.livestream) {
    params.set('livestream', launch.livestream);
  }

  if (launch.description) {
    params.set('description', launch.description);
  }

  if (launch.provider) {
    params.set('provider', launch.provider);
  }

  if (launch.statusName) {
    params.set('statusName', launch.statusName);
  }

  if (launch.missionType) {
    params.set('missionType', launch.missionType);
  }

  return params.toString();
}

export function launchFromIntelParams(searchParams: URLSearchParams): Launch {
  return {
    id: searchParams.get('id') || 'launch',
    name: searchParams.get('name') || 'Launch',
    date: searchParams.get('date') || new Date().toISOString(),
    dateUnix: Number.parseInt(searchParams.get('dateUnix') || '0', 10),
    rocket: searchParams.get('rocket') || 'Unknown Rocket',
    launchSite: searchParams.get('launchSite') || 'Unknown Site',
    status: (searchParams.get('status') as Launch['status']) || 'upcoming',
    statusName: searchParams.get('statusName'),
    missionType: searchParams.get('missionType'),
    livestream: searchParams.get('livestream'),
    description: searchParams.get('description'),
    isLive: searchParams.get('isLive') === 'true',
    image: null,
    missionPatch: null,
    location: null,
    provider: searchParams.get('provider'),
    source: (searchParams.get('source') as Launch['source']) || (searchParams.get('id')?.startsWith('spacex-') ? 'spacex' : 'll2'),
  };
}
