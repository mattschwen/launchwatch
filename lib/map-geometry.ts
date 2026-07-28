export interface MapPoint {
  x: number;
  y: number;
}

export interface MapViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface FitMapPointsOptions {
  aspectRatio?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;
  padding?: number;
}

export interface MapFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface RouteGeometry {
  start: MapPoint;
  control: MapPoint;
  end: MapPoint;
  path: string;
  offscreen: boolean;
  angle: number;
}

export interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
  leaderX: number;
  leaderY: number;
}

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function projectMapPoint(lng: number, lat: number): MapPoint {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - clamp(lat, -90, 90)) / 180) * MAP_HEIGHT,
  };
}

export function wrapXNear(x: number, referenceX: number): number {
  const turns = Math.round((referenceX - x) / MAP_WIDTH);
  return x + turns * MAP_WIDTH;
}

export function getMapViewport(
  center: [number, number],
  zoom: number
): MapViewport {
  const safeZoom = clamp(zoom, 1, 6);
  const focalPoint = projectMapPoint(center[0], center[1]);
  const width = MAP_WIDTH / safeZoom;
  const height = MAP_HEIGHT / safeZoom;

  return {
    x: focalPoint.x - width / 2,
    y: clamp(focalPoint.y - height / 2, 0, MAP_HEIGHT - height),
    width,
    height,
    zoom: safeZoom,
  };
}

export function fitMapPoints(
  points: MapPoint[],
  {
    aspectRatio = 2,
    maxWidth = MAP_WIDTH,
    minHeight = 230,
    minWidth = 460,
    padding = 72,
  }: FitMapPointsOptions = {}
): MapViewport {
  if (!points.length) {
    return {
      x: 0,
      y: 0,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      zoom: 1,
    };
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  let width = Math.max(minWidth, maxX - minX + padding * 2);
  let height = Math.max(minHeight, maxY - minY + padding * 2);

  if (width / height < aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  width = Math.min(width, maxWidth);
  height = Math.min(height, MAP_HEIGHT);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const x = centerX - width / 2;
  const y = clamp(centerY - height / 2, 0, MAP_HEIGHT - height);

  return {
    x,
    y,
    width,
    height,
    zoom: MAP_WIDTH / width,
  };
}

export function getMapFrame(
  viewport: MapViewport,
  screenInset = 28
): MapFrame {
  const inset = screenInset / viewport.zoom;

  return {
    left: viewport.x + inset,
    right: viewport.x + viewport.width - inset,
    top: viewport.y + inset,
    bottom: viewport.y + viewport.height - inset,
  };
}

export function isPointInFrame(point: MapPoint, frame: MapFrame): boolean {
  return (
    point.x >= frame.left &&
    point.x <= frame.right &&
    point.y >= frame.top &&
    point.y <= frame.bottom
  );
}

export function clampPointToFrame(
  point: MapPoint,
  frame: MapFrame
): MapPoint {
  return {
    x: clamp(point.x, frame.left, frame.right),
    y: clamp(point.y, frame.top, frame.bottom),
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getRouteGeometry(
  origin: MapPoint,
  destination: MapPoint,
  frame: MapFrame,
  zoom: number,
  routeIndex = 0
): RouteGeometry {
  const start = clampPointToFrame(origin, frame);
  const offscreen = !isPointInFrame(destination, frame);
  const deltaX = destination.x - start.x;
  const deltaY = destination.y - start.y;
  let progress = 1;

  if (offscreen) {
    if (deltaX > 0) {
      progress = Math.min(progress, (frame.right - start.x) / deltaX);
    } else if (deltaX < 0) {
      progress = Math.min(progress, (frame.left - start.x) / deltaX);
    }

    if (deltaY > 0) {
      progress = Math.min(progress, (frame.bottom - start.y) / deltaY);
    } else if (deltaY < 0) {
      progress = Math.min(progress, (frame.top - start.y) / deltaY);
    }
  }

  const end = clampPointToFrame(
    {
      x: start.x + deltaX * clamp(progress, 0, 1),
      y: start.y + deltaY * clamp(progress, 0, 1),
    },
    frame
  );
  const routeX = end.x - start.x;
  const routeY = end.y - start.y;
  const routeLength = Math.max(Math.hypot(routeX, routeY), 1);
  const direction = routeIndex % 2 === 0 ? 1 : -1;
  const bend = ((10 + (routeIndex % 3) * 4) / clamp(zoom, 1, 6)) * direction;
  const control = clampPointToFrame(
    {
      x: (start.x + end.x) / 2 + (-routeY / routeLength) * bend,
      y: (start.y + end.y) / 2 + (routeX / routeLength) * bend,
    },
    frame
  );

  return {
    start,
    control,
    end,
    offscreen,
    angle: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
    path: `M ${roundCoordinate(start.x)} ${roundCoordinate(
      start.y
    )} Q ${roundCoordinate(control.x)} ${roundCoordinate(
      control.y
    )} ${roundCoordinate(end.x)} ${roundCoordinate(end.y)}`,
  };
}

export function getFocusLabelBox(
  point: MapPoint,
  frame: MapFrame,
  labelLength: number,
  zoom: number
): LabelBox {
  const safeZoom = clamp(zoom, 1, 6);
  const width = clamp(labelLength * 6.4 + 30, 104, 188) / safeZoom;
  const height = 34 / safeZoom;
  const gap = 17 / safeZoom;
  const preferredY = point.y - height - gap;
  const fallbackY = point.y + gap;
  const y =
    preferredY >= frame.top
      ? preferredY
      : clamp(fallbackY, frame.top, frame.bottom - height);
  const x = clamp(
    point.x - width / 2,
    frame.left,
    Math.max(frame.left, frame.right - width)
  );

  return {
    x,
    y,
    width,
    height,
    leaderX: clamp(point.x, x + 10 / safeZoom, x + width - 10 / safeZoom),
    leaderY: y > point.y ? y : y + height,
  };
}
