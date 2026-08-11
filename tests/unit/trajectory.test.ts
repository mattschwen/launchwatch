import { describe, expect, it } from 'vitest';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  projectMapPoint,
  type MapPoint,
  type MapViewport,
} from '@/lib/map-geometry';
import {
  buildIllustrativeLaunchCorridor,
  buildIllustrativeTrajectory,
  classifyTargetOrbit,
  TRAJECTORY_DISCLOSURE,
} from '@/lib/trajectory';
import type { Launch } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function makeLaunch(overrides: Partial<Launch> = {}): Launch {
  return {
    ...UPCOMING_LAUNCHES[0],
    ...overrides,
  };
}

function pathPoints(path: string): MapPoint[] {
  const coordinates = (path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

  expect(coordinates.length % 2).toBe(0);

  return Array.from(
    { length: coordinates.length / 2 },
    (_, index) => ({
      x: coordinates[index * 2],
      y: coordinates[index * 2 + 1],
    })
  );
}

function expectPointInsideViewport(
  point: MapPoint,
  viewport: MapViewport
): void {
  expect(point.x).toBeGreaterThanOrEqual(viewport.x);
  expect(point.x).toBeLessThanOrEqual(viewport.x + viewport.width);
  expect(point.y).toBeGreaterThanOrEqual(viewport.y);
  expect(point.y).toBeLessThanOrEqual(viewport.y + viewport.height);
}

describe('illustrative trajectory model', () => {
  it('builds a deterministic, explicitly disclosed ready-state model', () => {
    const launch = makeLaunch();
    const first = buildIllustrativeTrajectory(launch);
    const second = buildIllustrativeTrajectory(launch);

    expect(first).toEqual(second);
    expect(first.availability).toBe('ready');
    expect(first.disclosure).toBe(TRAJECTORY_DISCLOSURE);
    expect(first.disclosure).toMatch(/not vehicle telemetry/i);
    expect(first.disclosure).toMatch(/not .*planned flight path/i);
    expect(first.phases.map((phase) => phase.id)).toEqual([
      'ascent-model',
      'target-orbit-model',
    ]);
    expect(first.phases[0].path).toMatch(/^M .* Q .*$/);
    expect(first.phases[1].path).toMatch(/^M .* C .*$/);
  });

  it('projects the reported launch coordinates exactly', () => {
    const location = {
      lat: 28.5619,
      lng: -80.5774,
      name: 'Cape Canaveral',
      countryCode: 'US',
    };
    const model = buildIllustrativeTrajectory(makeLaunch({ location }));

    expect(model.launchPoint).toEqual(
      projectMapPoint(location.lng, location.lat)
    );
    expect(model.phases[0].start).toEqual(model.launchPoint);
  });

  it('anchors its local zoom corridor at the reported coordinates', () => {
    const launch = makeLaunch();
    const corridor = buildIllustrativeLaunchCorridor(launch);

    expect(corridor).toHaveLength(4);
    expect(corridor[0]).toEqual({
      lat: launch.location!.lat,
      lng: launch.location!.lng,
    });
    expect(corridor.at(-1)).not.toEqual(corridor[0]);
    corridor.forEach(({ lat, lng }) => {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });

  it('does not invent a local corridor without a reported model', () => {
    expect(buildIllustrativeLaunchCorridor(makeLaunch({ orbit: null }))).toEqual([]);
    expect(buildIllustrativeLaunchCorridor(makeLaunch({ location: null }))).toEqual([]);
  });

  it('makes a northern inclined ascent rise before a separate orbit continuation', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        location: {
          lat: 28.5619,
          lng: -80.5774,
          name: 'Cape Canaveral',
          countryCode: 'US',
        },
        orbit: 'Low Earth Orbit',
      })
    );
    const ascent = model.phases[0];
    const orbit = model.phases[1];

    expect(ascent.id).toBe('ascent-model');
    expect(ascent.end.y).toBeLessThan(ascent.start.y);
    expect(ascent.end.x).toBeGreaterThan(ascent.start.x);
    expect(orbit.id).toBe('target-orbit-model');
    expect(orbit.start).toEqual(ascent.end);
    expect(orbit.end).not.toEqual(ascent.end);
    expect(orbit.end.y).toBeGreaterThan(ascent.end.y);
  });

  it('uses the orbit label only to choose a broad model family', () => {
    expect(classifyTargetOrbit('Sun-synchronous orbit')).toBe('polar');
    expect(classifyTargetOrbit('Geostationary transfer orbit')).toBe(
      'equatorial'
    );
    expect(classifyTargetOrbit('Lunar transfer')).toBe('departure');
    expect(classifyTargetOrbit('Low Earth Orbit')).toBe('inclined');
    expect(classifyTargetOrbit(null)).toBe('unknown');
    expect(classifyTargetOrbit('Unknown')).toBe('unknown');
    expect(classifyTargetOrbit('TBD')).toBe('unknown');
  });

  it('keeps complete route geometry inside its fitted focus viewport', () => {
    const launches = [
      makeLaunch(),
      makeLaunch({
        location: {
          lat: 5.236,
          lng: -52.768,
          name: 'Guiana Space Centre',
          countryCode: 'GF',
        },
        orbit: 'Geostationary transfer orbit',
      }),
      makeLaunch({
        location: {
          lat: 19.614,
          lng: 110.951,
          name: 'Wenchang Space Launch Site',
          countryCode: 'CN',
        },
        orbit: 'Low Earth Orbit',
      }),
      makeLaunch({
        location: {
          lat: -39.2615,
          lng: 177.8649,
          name: 'Rocket Lab Launch Complex 1',
          countryCode: 'NZ',
        },
        orbit: 'Sun-synchronous orbit',
      }),
    ];

    launches.forEach((launch) => {
      const model = buildIllustrativeTrajectory(launch);
      const routePoints = model.phases.flatMap((phase) =>
        pathPoints(phase.path)
      );
      const markers = [
        model.launchPoint,
        model.transitionPoint,
        model.targetPoint,
      ].filter((point): point is MapPoint => point !== null);

      expect(model.availability).toBe('ready');
      [...routePoints, ...markers].forEach((point) => {
        expectPointInsideViewport(point, model.focusViewport);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(MAP_HEIGHT);
      });
    });
  });

  it('preserves an eastern trajectory in an unwrapped world copy', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        location: {
          lat: -39.2615,
          lng: 177.8649,
          name: 'Rocket Lab Launch Complex 1',
          countryCode: 'NZ',
        },
        orbit: 'Sun-synchronous orbit',
      })
    );

    expect(model.launchPoint).toEqual(
      projectMapPoint(177.8649, -39.2615)
    );
    expect(model.launchPoint!.x).toBeLessThan(MAP_WIDTH);
    expect(model.transitionPoint!.x).toBeGreaterThan(MAP_WIDTH);
    expect(model.targetPoint!.x).toBeGreaterThan(
      model.transitionPoint!.x
    );
    expect(model.focusViewport.x + model.focusViewport.width).toBeGreaterThan(
      model.targetPoint!.x
    );
  });

  it('prefers the reported pad over a broader location label', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        launchSite: 'Space Launch Complex 40, Cape Canaveral',
        location: {
          lat: 28.5619,
          lng: -80.5774,
          name: 'Cape Canaveral',
          countryCode: 'US',
        },
      })
    );

    expect(model.siteLabel).toBe('SLC-40');
  });

  it('returns a site-only locator and does not infer a route without an orbit', () => {
    const model = buildIllustrativeTrajectory(makeLaunch({ orbit: null }));

    expect(model.availability).toBe('site-only');
    expect(model.orbitAvailable).toBe(false);
    expect(model.orbitLabel).toBe('Target orbit not supplied');
    expect(model.launchPoint).toEqual(
      projectMapPoint(
        UPCOMING_LAUNCHES[0].location!.lng,
        UPCOMING_LAUNCHES[0].location!.lat
      )
    );
    expect(model.transitionPoint).toBeNull();
    expect(model.targetPoint).toBeNull();
    expect(model.phases).toEqual([]);
    expectPointInsideViewport(model.launchPoint!, model.focusViewport);
  });

  it.each(['Unknown', 'Unknown orbit', 'TBD', 'N/A', '—'])(
    'treats placeholder orbit value %s as a site-only locator',
    (orbit) => {
      const model = buildIllustrativeTrajectory(makeLaunch({ orbit }));

      expect(model.availability).toBe('site-only');
      expect(model.orbitAvailable).toBe(false);
      expect(model.orbitLabel).toBe('Target orbit not supplied');
      expect(model.transitionPoint).toBeNull();
      expect(model.targetPoint).toBeNull();
      expect(model.phases).toEqual([]);
    }
  );

  it('returns orbit-only metadata without inventing an origin or route', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        launchSite: 'Space Launch Complex 40, Cape Canaveral',
        location: null,
      })
    );

    expect(model.availability).toBe('orbit-only');
    expect(model.orbitAvailable).toBe(true);
    expect(model.orbitLabel).toBe('Low Earth Orbit');
    expect(model.siteLabel).toBe('SLC-40');
    expect(model.launchPoint).toBeNull();
    expect(model.siteLabelPoint).toBeNull();
    expect(model.transitionPoint).toBeNull();
    expect(model.targetPoint).toBeNull();
    expect(model.phases).toEqual([]);
    expect(model.focusViewport).toEqual({
      x: 0,
      y: 0,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      zoom: 1,
    });
  });

  it('returns unavailable when neither coordinates nor an orbit are supplied', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        launchSite: 'Reported pad without coordinates',
        location: null,
        orbit: null,
      })
    );

    expect(model.availability).toBe('unavailable');
    expect(model.orbitAvailable).toBe(false);
    expect(model.launchPoint).toBeNull();
    expect(model.transitionPoint).toBeNull();
    expect(model.targetPoint).toBeNull();
    expect(model.phases).toEqual([]);
  });
});
