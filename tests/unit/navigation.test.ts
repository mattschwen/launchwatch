import type { MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  getPrimaryNavAccessibleLabel,
  isNavItemActive,
  PRIMARY_NAV_ITEMS,
  RESET_HISTORY_FILTERS_EVENT,
  RESET_SCHEDULE_FILTERS_EVENT,
  RESET_WATCH_SELECTION_EVENT,
  signalHistoryFilterReset,
  signalScheduleFilterReset,
  signalWatchSelectionReset,
} from '@/components/layout/navigation';

describe('getPrimaryNavAccessibleLabel', () => {
  const watchItem = PRIMARY_NAV_ITEMS.find((item) => item.href === '/watch')!;
  const homeItem = PRIMARY_NAV_ITEMS.find((item) => item.href === '/')!;

  it('adds a correctly pluralized live count to the Watch route', () => {
    expect(getPrimaryNavAccessibleLabel(watchItem, 1)).toBe(
      'Watch, 1 active live signal',
    );
    expect(getPrimaryNavAccessibleLabel(watchItem, 2)).toBe(
      'Watch, 2 active live signals',
    );
  });

  it('keeps ordinary route names stable without an applicable live signal', () => {
    expect(getPrimaryNavAccessibleLabel(watchItem, 0)).toBe('Watch');
    expect(getPrimaryNavAccessibleLabel(homeItem, 2)).toBe('Home');
  });
});

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
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
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
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  });

  it('leaves modified Home navigation to the browser', () => {
    window.history.replaceState({}, '', '/?q=Polaris');
    const resetListener = vi.fn();
    const preventDefault = vi.fn();
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
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
    expect(scrollTo).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?q=Polaris');
    window.removeEventListener(RESET_SCHEDULE_FILTERS_EVENT, resetListener);
  });

  it('returns an already-clean current route to its start without adding history', () => {
    window.history.replaceState({}, '', '/history');
    const pushState = vi.spyOn(window.history, 'pushState');
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
    const preventDefault = vi.fn();

    signalHistoryFilterReset({
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as MouseEvent<HTMLElement>);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(pushState).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  });

  it('commits a clean same-route Watch URL before signaling the mission reset', () => {
    window.history.replaceState({}, '', '/watch?id=spacex-demo-polaris');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const resetListener = vi.fn(() => {
      expect(window.location.pathname).toBe('/watch');
      expect(window.location.search).toBe('');
    });
    const preventDefault = vi.fn();
    window.addEventListener(RESET_WATCH_SELECTION_EVENT, resetListener, {
      once: true,
    });

    signalWatchSelectionReset({
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

  it('commits a clean same-route History URL before signaling the filter reset', () => {
    window.history.replaceState({}, '', '/history?q=Return');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const resetListener = vi.fn(() => {
      expect(window.location.pathname).toBe('/history');
      expect(window.location.search).toBe('');
    });
    const preventDefault = vi.fn();
    window.addEventListener(RESET_HISTORY_FILTERS_EVENT, resetListener, {
      once: true,
    });

    signalHistoryFilterReset({
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
});
