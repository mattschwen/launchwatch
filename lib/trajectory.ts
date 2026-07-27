import {
  clamp,
  MAP_HEIGHT,
  MAP_WIDTH,
  projectMapPoint,
  type MapPoint,
} from '@/lib/map-geometry';
import type { Launch } from '@/lib/types';

export type TrajectoryModelKind =
  | 'inclined'
  | 'polar'
  | 'equatorial'
  | 'departure'
  | 'unknown';

export interface TrajectoryPhase {
  id: 'ascent-model' | 'target-orbit-model';
  label: string;
  description: string;
  path: string;
  start: MapPoint;
  end: MapPoint;
  labelPoint: MapPoint;
}

export interface IllustrativeTrajectory {
  availability: 'ready' | 'missing-location';
  disclosure: string;
  modelKind: TrajectoryModelKind;
  orbitAvailable: boolean;
  orbitLabel: string;
  siteLabel: string;
  launchPoint: MapPoint | null;
  transitionPoint: MapPoint | null;
  targetPoint: MapPoint | null;
  phases: TrajectoryPhase[];
}

export const TRAJECTORY_DISCLOSURE =
  'Illustrative trajectory model — geometry is derived from the reported launch site and target orbit, not vehicle telemetry or a planned flight path.';

const FRAME = {
  left: 42,
  right: MAP_WIDTH - 42,
  top: 46,
  bottom: MAP_HEIGHT - 42,
};

function point(x: number, y: number): MapPoint {
  return {
    x: clamp(x, FRAME.left, FRAME.right),
    y: clamp(y, FRAME.top, FRAME.bottom),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function quadraticPath(
  start: MapPoint,
  control: MapPoint,
  end: MapPoint
): string {
  return `M ${round(start.x)} ${round(start.y)} Q ${round(
    control.x
  )} ${round(control.y)} ${round(end.x)} ${round(end.y)}`;
}

function cubicPath(
  start: MapPoint,
  controlOne: MapPoint,
  controlTwo: MapPoint,
  end: MapPoint
): string {
  return `M ${round(start.x)} ${round(start.y)} C ${round(
    controlOne.x
  )} ${round(controlOne.y)} ${round(controlTwo.x)} ${round(
    controlTwo.y
  )} ${round(end.x)} ${round(end.y)}`;
}

export function classifyTargetOrbit(
  orbit: string | null | undefined
): TrajectoryModelKind {
  if (!orbit?.trim()) return 'unknown';

  const normalized = orbit.toLocaleLowerCase('en-US');

  if (
    normalized.includes('polar') ||
    normalized.includes('sun-synchronous') ||
    normalized.includes('sun synchronous') ||
    /\bsso\b/.test(normalized)
  ) {
    return 'polar';
  }

  if (
    normalized.includes('geostationary') ||
    normalized.includes('geosynchronous') ||
    normalized.includes('geostationary transfer') ||
    /\bgto\b/.test(normalized) ||
    /\bgeo\b/.test(normalized)
  ) {
    return 'equatorial';
  }

  if (
    normalized.includes('lunar') ||
    normalized.includes('moon') ||
    normalized.includes('heliocentric') ||
    normalized.includes('interplanetary') ||
    normalized.includes('escape')
  ) {
    return 'departure';
  }

  return 'inclined';
}

function hasValidLocation(
  location: Launch['location']
): location is NonNullable<Launch['location']> {
  return Boolean(
    location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng) &&
      location.lat >= -90 &&
      location.lat <= 90 &&
      location.lng >= -180 &&
      location.lng <= 180
  );
}

function compactSiteLabel(launch: Launch): string {
  const reportedName = launch.location?.name?.trim() || launch.launchSite.trim();
  if (!reportedName) return 'Launch site not supplied';

  const firstSegment = reportedName.split(',')[0]?.trim() || reportedName;
  return firstSegment.length > 28
    ? `${firstSegment.slice(0, 27)}…`
    : firstSegment;
}

function targetVector(
  start: MapPoint,
  kind: TrajectoryModelKind
): MapPoint {
  const horizontalMagnitude =
    kind === 'polar'
      ? 230
      : kind === 'departure'
        ? 430
        : kind === 'equatorial'
          ? 390
          : kind === 'unknown'
            ? 180
            : 420;
  const horizontalDirection =
    start.x + horizontalMagnitude <= FRAME.right
      ? 1
      : start.x - horizontalMagnitude >= FRAME.left
        ? -1
        : start.x <= MAP_WIDTH / 2
          ? 1
          : -1;
  const verticalDelta =
    kind === 'polar'
      ? start.y > MAP_HEIGHT / 2
        ? -205
        : 205
      : kind === 'equatorial'
        ? (MAP_HEIGHT / 2 - start.y) * 0.76
        : kind === 'departure'
          ? start.y > MAP_HEIGHT / 2
            ? -150
            : 150
          : start.y > MAP_HEIGHT / 2
            ? -105
            : 105;

  return point(
    start.x + horizontalMagnitude * horizontalDirection,
    start.y + verticalDelta
  );
}

function interpolate(
  start: MapPoint,
  end: MapPoint,
  progress: number
): MapPoint {
  return point(
    start.x + (end.x - start.x) * progress,
    start.y + (end.y - start.y) * progress
  );
}

export function buildIllustrativeTrajectory(
  launch: Launch
): IllustrativeTrajectory {
  const orbitLabel = launch.orbit?.trim() || 'Target orbit not supplied';
  const orbitAvailable = Boolean(launch.orbit?.trim());
  const siteLabel = compactSiteLabel(launch);
  const modelKind = classifyTargetOrbit(launch.orbit);

  if (!hasValidLocation(launch.location)) {
    return {
      availability: 'missing-location',
      disclosure: TRAJECTORY_DISCLOSURE,
      modelKind,
      orbitAvailable,
      orbitLabel,
      siteLabel,
      launchPoint: null,
      transitionPoint: null,
      targetPoint: null,
      phases: [],
    };
  }

  const launchPoint = point(
    projectMapPoint(launch.location.lng, launch.location.lat).x,
    projectMapPoint(launch.location.lng, launch.location.lat).y
  );
  const targetPoint = targetVector(launchPoint, modelKind);
  const transitionProgress = orbitAvailable ? 0.3 : 0.72;
  const transitionPoint = interpolate(
    launchPoint,
    targetPoint,
    transitionProgress
  );
  const direction = Math.sign(targetPoint.x - launchPoint.x) || 1;
  const lift = modelKind === 'polar' ? 42 : 30;
  const ascentControl = point(
    (launchPoint.x + transitionPoint.x) / 2,
    (launchPoint.y + transitionPoint.y) / 2 - lift
  );
  const ascentLabelPoint = point(
    (launchPoint.x + transitionPoint.x) / 2 + direction * 12,
    Math.min(launchPoint.y, transitionPoint.y) - 22
  );
  const phases: TrajectoryPhase[] = [
    {
      id: 'ascent-model',
      label: 'Ascent model',
      description:
        'Illustrative ascent segment beginning at the reported launch site.',
      path: quadraticPath(launchPoint, ascentControl, transitionPoint),
      start: launchPoint,
      end: transitionPoint,
      labelPoint: ascentLabelPoint,
    },
  ];

  if (orbitAvailable) {
    const deltaX = targetPoint.x - transitionPoint.x;
    const deltaY = targetPoint.y - transitionPoint.y;
    const orbitControlOne = point(
      transitionPoint.x + deltaX * 0.28,
      transitionPoint.y + deltaY * 0.05 - 52
    );
    const orbitControlTwo = point(
      transitionPoint.x + deltaX * 0.72,
      transitionPoint.y + deltaY * 0.78 - 26
    );
    const orbitLabelPoint = point(
      transitionPoint.x + deltaX * 0.55,
      Math.min(transitionPoint.y, targetPoint.y) - 18
    );

    phases.push({
      id: 'target-orbit-model',
      label: 'Target-orbit model',
      description:
        'Illustrative continuation toward the provider-reported target orbit.',
      path: cubicPath(
        transitionPoint,
        orbitControlOne,
        orbitControlTwo,
        targetPoint
      ),
      start: transitionPoint,
      end: targetPoint,
      labelPoint: orbitLabelPoint,
    });
  }

  return {
    availability: 'ready',
    disclosure: TRAJECTORY_DISCLOSURE,
    modelKind,
    orbitAvailable,
    orbitLabel,
    siteLabel,
    launchPoint,
    transitionPoint,
    targetPoint: orbitAvailable ? targetPoint : null,
    phases,
  };
}
