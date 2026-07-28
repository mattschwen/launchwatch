import { describe, expect, it } from 'vitest';
import {
  buildIllustrativeTrajectory,
  classifyTargetOrbit,
  TRAJECTORY_DISCLOSURE,
  TRAJECTORY_GEOMETRY_FRAME,
  TRAJECTORY_LABEL_FRAME,
} from '@/lib/trajectory';
import type { Launch } from '@/lib/types';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function makeLaunch(overrides: Partial<Launch> = {}): Launch {
  return {
    ...UPCOMING_LAUNCHES[0],
    ...overrides,
  };
}

describe('illustrative trajectory model', () => {
  it('builds deterministic, explicitly disclosed phase geometry', () => {
    const launch = makeLaunch();
    const first = buildIllustrativeTrajectory(launch);
    const second = buildIllustrativeTrajectory(launch);

    expect(first).toEqual(second);
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

  it('keeps generated geometry within a padded world-map frame', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        location: {
          lat: 19.614,
          lng: 110.951,
          name: 'Wenchang Space Launch Site',
          countryCode: 'CN',
        },
        orbit: 'Low Earth Orbit',
      })
    );
    const coordinates = model.phases
      .flatMap((phase) => phase.path.match(/-?\d+(?:\.\d+)?/g) || [])
      .map(Number);

    coordinates.forEach((coordinate, index) => {
      const horizontal = index % 2 === 0;
      expect(coordinate).toBeGreaterThanOrEqual(
        horizontal
          ? TRAJECTORY_GEOMETRY_FRAME.left
          : TRAJECTORY_GEOMETRY_FRAME.top
      );
      expect(coordinate).toBeLessThanOrEqual(
        horizontal
          ? TRAJECTORY_GEOMETRY_FRAME.right
          : TRAJECTORY_GEOMETRY_FRAME.bottom
      );
    });
  });

  it('keeps markers and every text anchor inside their padded frames', () => {
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
      const markers = [
        model.launchPoint,
        model.transitionPoint,
        model.targetPoint,
      ].filter((item) => item !== null);
      const labels = [
        model.siteLabelPoint,
        ...model.phases.map((phase) => phase.labelPoint),
      ].filter((item) => item !== null);

      markers.forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(TRAJECTORY_GEOMETRY_FRAME.left);
        expect(x).toBeLessThanOrEqual(TRAJECTORY_GEOMETRY_FRAME.right);
        expect(y).toBeGreaterThanOrEqual(TRAJECTORY_GEOMETRY_FRAME.top);
        expect(y).toBeLessThanOrEqual(TRAJECTORY_GEOMETRY_FRAME.bottom);
      });
      labels.forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(TRAJECTORY_LABEL_FRAME.left);
        expect(x).toBeLessThanOrEqual(TRAJECTORY_LABEL_FRAME.right);
        expect(y).toBeGreaterThanOrEqual(TRAJECTORY_LABEL_FRAME.top);
        expect(y).toBeLessThanOrEqual(TRAJECTORY_LABEL_FRAME.bottom);
      });
    });
  });

  it('keeps a long eastern-edge site label inside the map frame', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        launchSite:
          'Easternmost Experimental Launch Facility Alpha, Pacific Ocean',
        location: {
          lat: 12,
          lng: 176,
          name: 'Easternmost Experimental Launch Facility Alpha',
          countryCode: 'KI',
        },
      })
    );
    const renderedCharacterCount = Math.min(model.siteLabel.length, 24);
    const estimatedHalfWidth = Math.max(
      44,
      renderedCharacterCount * 7.25
    );

    expect(model.siteLabelAnchor).toBe('middle');
    expect(model.siteLabelPoint).not.toBeNull();
    expect(model.siteLabelPoint!.x - estimatedHalfWidth).toBeGreaterThanOrEqual(
      TRAJECTORY_LABEL_FRAME.left
    );
    expect(model.siteLabelPoint!.x + estimatedHalfWidth).toBeLessThanOrEqual(
      TRAJECTORY_LABEL_FRAME.right
    );
  });

  it('prefers a meaningful reported site over placeholder location copy', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        launchSite: 'Space Launch Complex 40, Cape Canaveral',
        location: {
          lat: 28.5619,
          lng: -80.5774,
          name: 'Unknown Site',
          countryCode: 'US',
        },
      })
    );

    expect(model.siteLabel).toBe('SLC-40');
  });

  it('draws only the ascent model when the source has no target orbit', () => {
    const model = buildIllustrativeTrajectory(makeLaunch({ orbit: null }));

    expect(model.availability).toBe('ready');
    expect(model.orbitAvailable).toBe(false);
    expect(model.orbitLabel).toBe('Target orbit not supplied');
    expect(model.targetPoint).toBeNull();
    expect(model.phases.map((phase) => phase.id)).toEqual(['ascent-model']);
  });

  it.each(['Unknown', 'Unknown orbit', 'TBD', 'N/A', '—'])(
    'treats the placeholder orbit value %s as unavailable',
    (orbit) => {
      const model = buildIllustrativeTrajectory(makeLaunch({ orbit }));

      expect(model.orbitAvailable).toBe(false);
      expect(model.orbitLabel).toBe('Target orbit not supplied');
      expect(model.targetPoint).toBeNull();
      expect(model.phases.map((phase) => phase.id)).toEqual(['ascent-model']);
    }
  );

  it('does not invent geometry when launch coordinates are unavailable', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        launchSite: 'Space Launch Complex 40, Cape Canaveral',
        location: null,
      })
    );

    expect(model.availability).toBe('missing-location');
    expect(model.siteLabel).toBe('SLC-40');
    expect(model.launchPoint).toBeNull();
    expect(model.siteLabelPoint).toBeNull();
    expect(model.transitionPoint).toBeNull();
    expect(model.targetPoint).toBeNull();
    expect(model.phases).toEqual([]);
  });
});
