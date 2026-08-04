import type { MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  isNavItemActive,
  RESET_SCHEDULE_FILTERS_EVENT,
  signalScheduleFilterReset,
} from '@/components/layout/navigation';

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

  it('commits a clean same-route Home URL before signaling the filter reset', () => {
    window.history.replaceState({}, '', '/?q=Polaris');
    const resetListener = vi.fn(() => {
      expect(window.location.pathname).toBe('/');
      expect(window.location.search).toBe('');
    });
    const preventDefault = vi.fn();
    window.addEventListener(RESET_SCHEDULE_FILTERS_EVENT, resetListener, {
      once: true,
    });

    signalScheduleFilterReset({
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as MouseEvent<HTMLElement>);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(resetListener).toHaveBeenCalledOnce();
  });

  it('leaves modified Home navigation to the browser', () => {
    window.history.replaceState({}, '', '/?q=Polaris');
    const resetListener = vi.fn();
    const preventDefault = vi.fn();
    window.addEventListener(RESET_SCHEDULE_FILTERS_EVENT, resetListener, {
      once: true,
    });

    signalScheduleFilterReset({
      defaultPrevented: false,
      button: 0,
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as MouseEvent<HTMLElement>);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(resetListener).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?q=Polaris');
    window.removeEventListener(RESET_SCHEDULE_FILTERS_EVENT, resetListener);
  });
});
