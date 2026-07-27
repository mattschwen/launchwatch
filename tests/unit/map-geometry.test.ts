import { describe, expect, it } from 'vitest';
import {
  getFocusLabelBox,
  getMapFrame,
  getMapViewport,
  getRouteGeometry,
  isPointInFrame,
  MAP_WIDTH,
  projectMapPoint,
  wrapXNear,
} from '@/lib/map-geometry';

const VANDENBERG: [number, number] = [-120.611, 34.632];
const GUIANA: [number, number] = [-52.768, 5.236];

describe('map geometry', () => {
  it('terminates an offscreen route inside the padded map frame', () => {
    const viewport = getMapViewport(VANDENBERG, 3);
    const frame = getMapFrame(viewport);
    const origin = projectMapPoint(...VANDENBERG);
    const destination = projectMapPoint(...GUIANA);
    const route = getRouteGeometry(
      origin,
      destination,
      frame,
      viewport.zoom
    );

    expect(route.offscreen).toBe(true);
    expect(isPointInFrame(route.end, frame)).toBe(true);
    expect(route.end.x).toBeLessThan(viewport.x + viewport.width);
    expect(route.end.y).toBeLessThan(viewport.y + viewport.height);
    expect(route.end).not.toEqual(destination);
    expect(route.path).toMatch(/^M .* Q .*$/);
  });

  it('keeps a visible destination at its real projected position', () => {
    const viewport = getMapViewport(VANDENBERG, 3);
    const frame = getMapFrame(viewport);
    const origin = projectMapPoint(...VANDENBERG);
    const destination = projectMapPoint(-80.5774, 28.5619);
    const route = getRouteGeometry(
      origin,
      destination,
      frame,
      viewport.zoom
    );

    expect(route.offscreen).toBe(false);
    expect(route.end.x).toBeCloseTo(destination.x, 5);
    expect(route.end.y).toBeCloseTo(destination.y, 5);
  });

  it('places the focus label fully inside the frame at every edge', () => {
    const viewport = getMapViewport(VANDENBERG, 3.2);
    const frame = getMapFrame(viewport);
    const edgePoint = { x: frame.right - 0.1, y: frame.top + 0.1 };
    const label = getFocusLabelBox(edgePoint, frame, 24, viewport.zoom);

    expect(label.x).toBeGreaterThanOrEqual(frame.left);
    expect(label.y).toBeGreaterThanOrEqual(frame.top);
    expect(label.x + label.width).toBeLessThanOrEqual(frame.right);
    expect(label.y + label.height).toBeLessThanOrEqual(frame.bottom);
  });

  it('keeps focus-label dimensions visually constant while zooming', () => {
    const oneX = getMapViewport(VANDENBERG, 1);
    const threeX = getMapViewport(VANDENBERG, 3);
    const point = projectMapPoint(...VANDENBERG);
    const oneXLabel = getFocusLabelBox(
      point,
      getMapFrame(oneX),
      14,
      oneX.zoom
    );
    const threeXLabel = getFocusLabelBox(
      point,
      getMapFrame(threeX),
      14,
      threeX.zoom
    );

    expect(oneXLabel.width * oneX.zoom).toBeCloseTo(
      threeXLabel.width * threeX.zoom,
      5
    );
    expect(oneXLabel.height * oneX.zoom).toBeCloseTo(
      threeXLabel.height * threeX.zoom,
      5
    );
  });

  it('wraps locations across the date line toward the nearest world copy', () => {
    const eastOfDateLine = projectMapPoint(179, 0);
    const westOfDateLine = projectMapPoint(-179, 0);
    const wrappedWest = wrapXNear(westOfDateLine.x, eastOfDateLine.x);

    expect(Math.abs(wrappedWest - eastOfDateLine.x)).toBeLessThan(10);
    expect(wrappedWest).toBeGreaterThan(MAP_WIDTH);
  });
});
