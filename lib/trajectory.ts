import {
  clamp,
  MAP_HEIGHT,
  MAP_WIDTH,
  projectMapPoint,
  type MapPoint,
} from '@/lib/map-geometry';
import {
  firstLaunchValue,
  isMeaningfulLaunchValue,
  shortenLaunchSite,
} from '@/lib/format';
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
  siteLabelPoint: MapPoint | null;
  siteLabelAnchor: 'start' | 'middle' | 'end';
  transitionPoint: MapPoint | null;
  targetPoint: MapPoint | null;
  phases: TrajectoryPhase[];
}

export const TRAJECTORY_DISCLOSURE =
  'Illustrative trajectory model — geometry is derived from the reported launch site and target orbit, not vehicle telemetry or a planned flight path.';

export const TRAJECTORY_GEOMETRY_FRAME = {
  left: 50,
  right: MAP_WIDTH - 50,
  top: 55,
  bottom: MAP_HEIGHT - 55,
} as const;

export const TRAJECTORY_LABEL_FRAME = {
  left: 155,
  right: MAP_WIDTH - 155,
  top: 82,
  bottom: MAP_HEIGHT - 105,
} as const;

function geometryPoint(x: number, y: number): MapPoint {
  return {
    x: clamp(
      x,
      TRAJECTORY_GEOMETRY_FRAME.left,
      TRAJECTORY_GEOMETRY_FRAME.right
    ),
    y: clamp(
      y,
      TRAJECTORY_GEOMETRY_FRAME.top,
      TRAJECTORY_GEOMETRY_FRAME.bottom
    ),
  };
}

function labelPoint(x: number, y: number): MapPoint {
  return {
    x: clamp(x, TRAJECTORY_LABEL_FRAME.left, TRAJECTORY_LABEL_FRAME.right),
    y: clamp(y, TRAJECTORY_LABEL_FRAME.top, TRAJECTORY_LABEL_FRAME.bottom),
  };
}

const MODEL_GEOMETRY: Record<
  TrajectoryModelKind,
  { ascentRun: number; ascentRise: number; orbitRun: number }
> = {
  inclined: { ascentRun: 125, ascentRise: 86, orbitRun: 340 },
  polar: { ascentRun: 95, ascentRise: 110, orbitRun: 225 },
  equatorial: { ascentRun: 120, ascentRise: 72, orbitRun: 330 },
  departure: { ascentRun: 135, ascentRise: 96, orbitRun: 375 },
  unknown: { ascentRun: 110, ascentRise: 70, orbitRun: 0 },
};

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
  if (!isMeaningfulLaunchValue(orbit)) return 'unknown';

  const normalized = orbit.trim().toLocaleLowerCase('en-US');

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
  const reportedName = firstLaunchValue(
    [launch.location?.name, launch.launchSite],
    'Launch site not supplied'
  );

  const firstSegment = shortenLaunchSite(
    reportedName.split(',')[0]?.trim() || reportedName
  );
  return firstSegment.length > 28
    ? `${firstSegment.slice(0, 27)}…`
    : firstSegment;
}

function horizontalDirection(
  start: MapPoint,
  requiredRun: number
): 1 | -1 {
  const roomToRight = TRAJECTORY_GEOMETRY_FRAME.right - start.x;
  const roomToLeft = start.x - TRAJECTORY_GEOMETRY_FRAME.left;

  if (roomToRight >= requiredRun) return 1;
  if (roomToLeft >= requiredRun) return -1;
  return roomToRight >= roomToLeft ? 1 : -1;
}

function buildSiteLabelPlacement(
  launchPoint: MapPoint,
  siteLabel: string
): Pick<
  IllustrativeTrajectory,
  'siteLabelPoint' | 'siteLabelAnchor'
> {
  const visibleCharacterCount = Math.min(siteLabel.length, 24);
  const estimatedHalfWidth = clamp(
    visibleCharacterCount * 7.25,
    44,
    (TRAJECTORY_LABEL_FRAME.right - TRAJECTORY_LABEL_FRAME.left) / 2
  );
  const minCenterX = TRAJECTORY_LABEL_FRAME.left + estimatedHalfWidth;
  const maxCenterX = TRAJECTORY_LABEL_FRAME.right - estimatedHalfWidth;
  const placeOnLeft = launchPoint.x > MAP_WIDTH / 2;
  const preferredCenterX =
    launchPoint.x +
    (placeOnLeft ? -1 : 1) * Math.min(estimatedHalfWidth + 18, 170);
  const placeAbove = launchPoint.y > TRAJECTORY_GEOMETRY_FRAME.bottom - 58;

  return {
    siteLabelPoint: {
      x: clamp(preferredCenterX, minCenterX, maxCenterX),
      y: clamp(
        launchPoint.y + (placeAbove ? -31 : 40),
        TRAJECTORY_LABEL_FRAME.top,
        TRAJECTORY_LABEL_FRAME.bottom
      ),
    },
    siteLabelAnchor: 'middle',
  };
}

function buildTransitionPoint(
  start: MapPoint,
  kind: TrajectoryModelKind,
  direction: 1 | -1
): MapPoint {
  const geometry = MODEL_GEOMETRY[kind];
  const verticalDirection = start.y <= MAP_HEIGHT / 2 ? -1 : 1;

  return geometryPoint(
    start.x + geometry.ascentRun * direction,
    start.y + geometry.ascentRise * verticalDirection
  );
}

function buildTargetPoint(
  start: MapPoint,
  transition: MapPoint,
  kind: TrajectoryModelKind,
  direction: 1 | -1
): MapPoint {
  const verticalDirection = start.y <= MAP_HEIGHT / 2 ? -1 : 1;
  const targetY =
    kind === 'polar'
      ? verticalDirection < 0
        ? TRAJECTORY_GEOMETRY_FRAME.top + 14
        : TRAJECTORY_GEOMETRY_FRAME.bottom - 14
      : kind === 'equatorial'
        ? MAP_HEIGHT / 2
        : kind === 'departure'
          ? transition.y + verticalDirection * 58
          : start.y - verticalDirection * 58;

  return geometryPoint(
    transition.x + MODEL_GEOMETRY[kind].orbitRun * direction,
    targetY
  );
}

export function buildIllustrativeTrajectory(
  launch: Launch
): IllustrativeTrajectory {
  const meaningfulOrbit = isMeaningfulLaunchValue(launch.orbit)
    ? launch.orbit.trim()
    : null;
  const orbitLabel = meaningfulOrbit || 'Target orbit not supplied';
  const orbitAvailable = Boolean(meaningfulOrbit);
  const siteLabel = compactSiteLabel(launch);
  const modelKind = classifyTargetOrbit(meaningfulOrbit);

  if (!hasValidLocation(launch.location)) {
    return {
      availability: 'missing-location',
      disclosure: TRAJECTORY_DISCLOSURE,
      modelKind,
      orbitAvailable,
      orbitLabel,
      siteLabel,
      launchPoint: null,
      siteLabelPoint: null,
      siteLabelAnchor: 'middle',
      transitionPoint: null,
      targetPoint: null,
      phases: [],
    };
  }

  const projectedLaunchPoint = projectMapPoint(
    launch.location.lng,
    launch.location.lat
  );
  const launchPoint = geometryPoint(
    projectedLaunchPoint.x,
    projectedLaunchPoint.y
  );
  const requiredRun =
    MODEL_GEOMETRY[modelKind].ascentRun +
    (orbitAvailable ? MODEL_GEOMETRY[modelKind].orbitRun : 0);
  const direction = horizontalDirection(launchPoint, requiredRun);
  const transitionPoint = buildTransitionPoint(
    launchPoint,
    modelKind,
    direction
  );
  const targetPoint = orbitAvailable
    ? buildTargetPoint(
        launchPoint,
        transitionPoint,
        modelKind,
        direction
      )
    : null;
  const verticalDirection = launchPoint.y <= MAP_HEIGHT / 2 ? -1 : 1;
  const ascentControl = geometryPoint(
    (launchPoint.x + transitionPoint.x) / 2,
    (launchPoint.y + transitionPoint.y) / 2 +
      verticalDirection * (modelKind === 'polar' ? 30 : 24)
  );
  const ascentLabelPoint = labelPoint(
    transitionPoint.x + direction * 38,
    transitionPoint.y - verticalDirection * 32
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

  if (targetPoint) {
    const deltaX = targetPoint.x - transitionPoint.x;
    const deltaY = targetPoint.y - transitionPoint.y;
    const arcDirection = transitionPoint.y <= MAP_HEIGHT / 2 ? -1 : 1;
    const orbitControlOne = geometryPoint(
      transitionPoint.x + deltaX * 0.28,
      transitionPoint.y + deltaY * 0.08 + arcDirection * 62
    );
    const orbitControlTwo = geometryPoint(
      transitionPoint.x + deltaX * 0.72,
      targetPoint.y - deltaY * 0.16 + arcDirection * 44
    );
    const orbitLabelPoint = labelPoint(
      targetPoint.x - direction * 54,
      targetPoint.y + arcDirection * 46
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
    ...buildSiteLabelPlacement(launchPoint, siteLabel),
    transitionPoint,
    targetPoint,
    phases,
  };
}
