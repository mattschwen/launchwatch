import { describe, expect, it } from 'vitest';
import {
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

  it('uses the orbit label only to choose a broad model family', () => {
    expect(classifyTargetOrbit('Sun-synchronous orbit')).toBe('polar');
    expect(classifyTargetOrbit('Geostationary transfer orbit')).toBe(
      'equatorial'
    );
    expect(classifyTargetOrbit('Lunar transfer')).toBe('departure');
    expect(classifyTargetOrbit('Low Earth Orbit')).toBe('inclined');
    expect(classifyTargetOrbit(null)).toBe('unknown');
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
      expect(coordinate).toBeGreaterThanOrEqual(horizontal ? 42 : 46);
      expect(coordinate).toBeLessThanOrEqual(horizontal ? 958 : 458);
    });
  });

  it('draws only the ascent model when the source has no target orbit', () => {
    const model = buildIllustrativeTrajectory(makeLaunch({ orbit: null }));

    expect(model.availability).toBe('ready');
    expect(model.orbitAvailable).toBe(false);
    expect(model.orbitLabel).toBe('Target orbit not supplied');
    expect(model.targetPoint).toBeNull();
    expect(model.phases.map((phase) => phase.id)).toEqual(['ascent-model']);
  });

  it('does not invent geometry when launch coordinates are unavailable', () => {
    const model = buildIllustrativeTrajectory(
      makeLaunch({
        launchSite: 'Space Launch Complex 40, Cape Canaveral',
        location: null,
      })
    );

    expect(model.availability).toBe('missing-location');
    expect(model.siteLabel).toBe('Space Launch Complex 40');
    expect(model.launchPoint).toBeNull();
    expect(model.transitionPoint).toBeNull();
    expect(model.targetPoint).toBeNull();
    expect(model.phases).toEqual([]);
  });
});
