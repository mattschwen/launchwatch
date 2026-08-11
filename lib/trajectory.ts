import {
  clamp,
  fitMapPoints,
  MAP_HEIGHT,
  MAP_WIDTH,
  projectMapPoint,
  type MapPoint,
  type MapViewport,
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

export type TrajectoryAvailability =
  | 'ready'
  | 'site-only'
  | 'orbit-only'
  | 'unavailable';

export type TrajectoryPhaseId =
  | 'ascent-model'
  | 'target-orbit-model';

export interface TrajectoryPhase {
  id: TrajectoryPhaseId;
  label: string;
  shortLabel: string;
  description: string;
  path: string;
  start: MapPoint;
  end: MapPoint;
  labelPoint: MapPoint;
}

export interface IllustrativeTrajectory {
  availability: TrajectoryAvailability;
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
  focusViewport: MapViewport;
}

export interface TrajectoryCoordinate {
  lat: number;
  lng: number;
}

export const TRAJECTORY_DISCLOSURE =
  'Illustrative trajectory model — geometry is derived from the reported launch site and target orbit, not vehicle telemetry or a planned flight path.';

export const TRAJECTORY_GEOMETRY_FRAME = {
  left: 0,
  right: MAP_WIDTH,
  top: 0,
  bottom: MAP_HEIGHT,
} as const;

export const TRAJECTORY_LABEL_FRAME = {
  left: 24,
  right: MAP_WIDTH - 24,
  top: 24,
  bottom: MAP_HEIGHT - 24,
} as const;

const WORLD_VIEWPORT: MapViewport = {
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  zoom: 1,
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

function destinationCoordinate(
  origin: TrajectoryCoordinate,
  bearing: number,
  distanceKm: number
): TrajectoryCoordinate {
  const earthRadiusKm = 6_371;
  const angularDistance = distanceKm / earthRadiusKm;
  const bearingRadians = bearing * Math.PI / 180;
  const latitude = origin.lat * Math.PI / 180;
  const longitude = origin.lng * Math.PI / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearingRadians)
  );
  const nextLongitude = longitude + Math.atan2(
    Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude)
  );

  return {
    lat: nextLatitude * 180 / Math.PI,
    lng: ((nextLongitude * 180 / Math.PI + 540) % 360) - 180,
  };
}

/**
 * Builds a short, local-scale rendering of the same illustrative model used by
 * the world map. Keeping it anchored at the reported coordinates means the
 * model remains legible as the launch-site atlas is zoomed toward pad level.
 */
export function buildIllustrativeLaunchCorridor(
  launch: Launch,
  modelKind = classifyTargetOrbit(launch.orbit)
): TrajectoryCoordinate[] {
  if (!hasValidLocation(launch.location) || modelKind === 'unknown') return [];

  const origin = { lat: launch.location.lat, lng: launch.location.lng };
  const northern = origin.lat >= 0;
  const initialBearing =
    modelKind === 'polar'
      ? northern ? 350 : 170
      : modelKind === 'equatorial'
        ? northern ? 112 : 68
        : modelKind === 'departure'
          ? northern ? 74 : 106
          : northern ? 66 : 114;
  const bearingDrift = modelKind === 'polar' ? 4 : northern ? 10 : -10;

  return [
    origin,
    destinationCoordinate(origin, initialBearing, 24),
    destinationCoordinate(origin, initialBearing + bearingDrift * 0.45, 72),
    destinationCoordinate(origin, initialBearing + bearingDrift, 160),
  ];
}

function compactSiteLabel(launch: Launch): string {
  const reportedName = firstLaunchValue(
    [launch.launchSite, launch.location?.name],
    'Launch site not supplied'
  );
  const firstSegment = shortenLaunchSite(
    reportedName.split(',')[0]?.trim() || reportedName
  );

  return firstSegment.length > 30
    ? `${firstSegment.slice(0, 29)}…`
    : firstSegment;
}

function buildSiteLabelPlacement(
  launchPoint: MapPoint
): Pick<
  IllustrativeTrajectory,
  'siteLabelPoint' | 'siteLabelAnchor'
> {
  const placeOnLeft = launchPoint.x > MAP_WIDTH / 2;

  return {
    siteLabelPoint: {
      x: clamp(
        launchPoint.x + (placeOnLeft ? -26 : 26),
        TRAJECTORY_LABEL_FRAME.left,
        TRAJECTORY_LABEL_FRAME.right
      ),
      y: clamp(
        launchPoint.y + (launchPoint.y > MAP_HEIGHT - 70 ? -30 : 34),
        TRAJECTORY_LABEL_FRAME.top,
        TRAJECTORY_LABEL_FRAME.bottom
      ),
    },
    siteLabelAnchor: placeOnLeft ? 'end' : 'start',
  };
}

function verticalDirection(latitude: number): 1 | -1 {
  return latitude >= 0 ? -1 : 1;
}

function buildTransitionPoint(
  start: MapPoint,
  latitude: number,
  kind: TrajectoryModelKind
): MapPoint {
  const vertical = verticalDirection(latitude);
  const geometry =
    kind === 'polar'
      ? { run: 72, rise: 122 }
      : kind === 'equatorial'
        ? { run: 142, rise: Math.abs(MAP_HEIGHT / 2 - start.y) * 0.62 }
        : kind === 'departure'
          ? { run: 156, rise: 104 }
          : { run: 138, rise: 88 };
  const targetY =
    kind === 'equatorial'
      ? start.y + (MAP_HEIGHT / 2 - start.y) * 0.62
      : start.y + geometry.rise * vertical;

  return {
    x: start.x + geometry.run,
    y: clamp(targetY, 42, MAP_HEIGHT - 42),
  };
}

function buildTargetPoint(
  start: MapPoint,
  transition: MapPoint,
  latitude: number,
  kind: TrajectoryModelKind
): MapPoint {
  const vertical = verticalDirection(latitude);
  const run =
    kind === 'polar'
      ? 210
      : kind === 'departure'
        ? 382
        : kind === 'equatorial'
          ? 342
          : 328;
  const targetY =
    kind === 'polar'
      ? clamp(transition.y + vertical * 72, 38, MAP_HEIGHT - 38)
      : kind === 'equatorial'
        ? MAP_HEIGHT / 2
        : kind === 'departure'
          ? clamp(transition.y + vertical * 56, 38, MAP_HEIGHT - 38)
          : clamp(
              transition.y + (MAP_HEIGHT / 2 - transition.y) * 0.28,
              38,
              MAP_HEIGHT - 38
            );

  return {
    x: transition.x + run,
    y: targetY || start.y,
  };
}

function phaseLabelPoint(
  start: MapPoint,
  end: MapPoint,
  vertical: 1 | -1
): MapPoint {
  return {
    x: (start.x + end.x) / 2,
    y: clamp(
      Math.min(start.y, end.y) + (vertical < 0 ? -24 : 42),
      28,
      MAP_HEIGHT - 28
    ),
  };
}

function emptyTrajectory(
  availability: Extract<
    TrajectoryAvailability,
    'orbit-only' | 'unavailable'
  >,
  modelKind: TrajectoryModelKind,
  orbitLabel: string,
  orbitAvailable: boolean,
  siteLabel: string
): IllustrativeTrajectory {
  return {
    availability,
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
    focusViewport: WORLD_VIEWPORT,
  };
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
  const location = hasValidLocation(launch.location)
    ? launch.location
    : null;

  if (!location) {
    return emptyTrajectory(
      orbitAvailable ? 'orbit-only' : 'unavailable',
      modelKind,
      orbitLabel,
      orbitAvailable,
      siteLabel
    );
  }

  const launchPoint = projectMapPoint(
    location.lng,
    location.lat
  );
  const sitePlacement = buildSiteLabelPlacement(launchPoint);

  if (!orbitAvailable) {
    return {
      availability: 'site-only',
      disclosure: TRAJECTORY_DISCLOSURE,
      modelKind,
      orbitAvailable,
      orbitLabel,
      siteLabel,
      launchPoint,
      ...sitePlacement,
      transitionPoint: null,
      targetPoint: null,
      phases: [],
      focusViewport: fitMapPoints([launchPoint], {
        minHeight: 250,
        minWidth: 500,
        padding: 96,
      }),
    };
  }

  const vertical = verticalDirection(location.lat);
  const transitionPoint = buildTransitionPoint(
    launchPoint,
    location.lat,
    modelKind
  );
  const targetPoint = buildTargetPoint(
    launchPoint,
    transitionPoint,
    location.lat,
    modelKind
  );
  const ascentControl: MapPoint = {
    x: (launchPoint.x + transitionPoint.x) / 2,
    y: clamp(
      (launchPoint.y + transitionPoint.y) / 2 + vertical * 34,
      34,
      MAP_HEIGHT - 34
    ),
  };
  const ascentPhase: TrajectoryPhase = {
    id: 'ascent-model',
    label: 'Illustrative ascent',
    shortLabel: 'Ascent model',
    description:
      'Illustrative ascent segment beginning at the reported launch site.',
    path: quadraticPath(launchPoint, ascentControl, transitionPoint),
    start: launchPoint,
    end: transitionPoint,
    labelPoint: phaseLabelPoint(launchPoint, transitionPoint, vertical),
  };
  const deltaX = targetPoint.x - transitionPoint.x;
  const deltaY = targetPoint.y - transitionPoint.y;
  const arcDirection = transitionPoint.y <= MAP_HEIGHT / 2 ? -1 : 1;
  const orbitControlOne: MapPoint = {
    x: transitionPoint.x + deltaX * 0.3,
    y: clamp(
      transitionPoint.y + deltaY * 0.08 + arcDirection * 54,
      34,
      MAP_HEIGHT - 34
    ),
  };
  const orbitControlTwo: MapPoint = {
    x: transitionPoint.x + deltaX * 0.72,
    y: clamp(
      targetPoint.y - deltaY * 0.15 + arcDirection * 34,
      34,
      MAP_HEIGHT - 34
    ),
  };
  const orbitPhase: TrajectoryPhase = {
    id: 'target-orbit-model',
    label: 'Reported target orbit',
    shortLabel: 'Target-orbit model',
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
    labelPoint: phaseLabelPoint(transitionPoint, targetPoint, arcDirection),
  };
  const phases = [ascentPhase, orbitPhase];
  const focusViewport = fitMapPoints(
    [
      launchPoint,
      transitionPoint,
      targetPoint,
      ascentControl,
      orbitControlOne,
      orbitControlTwo,
    ],
    {
      minHeight: 245,
      minWidth: 500,
      padding: 82,
    }
  );

  return {
    availability: 'ready',
    disclosure: TRAJECTORY_DISCLOSURE,
    modelKind,
    orbitAvailable,
    orbitLabel,
    siteLabel,
    launchPoint,
    ...sitePlacement,
    transitionPoint,
    targetPoint,
    phases,
    focusViewport,
  };
}
