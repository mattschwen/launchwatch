import { describe, expect, it } from 'vitest';
import { isNavItemActive } from '@/components/layout/navigation';

describe('isNavItemActive', () => {
  it.each([
    { source: null, activeHref: '/' },
    { source: 'home', activeHref: '/' },
    { source: 'watch', activeHref: '/watch' },
    { source: 'history', activeHref: '/history' },
    { source: 'unknown', activeHref: '/' },
  ])(
    'keeps $activeHref current for a detail route from $source',
    ({ source, activeHref }) => {
      const hrefs = ['/', '/watch', '/history'];
      expect(
        hrefs.filter((href) =>
          isNavItemActive('/launch/ll2-demo-orbital-dawn', href, source),
        ),
      ).toEqual([activeHref]);
    },
  );

  it('preserves direct navigation matching outside detail routes', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/watch', '/watch')).toBe(true);
    expect(isNavItemActive('/history', '/history')).toBe(true);
    expect(isNavItemActive('/history', '/')).toBe(false);
  });
});
