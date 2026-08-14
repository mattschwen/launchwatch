import { Archive, Home, Tv, type LucideIcon } from 'lucide-react';
import type { MouseEvent } from 'react';

export const RESET_SCHEDULE_FILTERS_EVENT =
  'launchwatch:reset-schedule-filters';
export const RESET_WATCH_SELECTION_EVENT =
  'launchwatch:reset-watch-selection';
export const RESET_HISTORY_FILTERS_EVENT =
  'launchwatch:reset-history-filters';

function signalFilteredRouteReset(
  event: MouseEvent<HTMLElement>,
  pathname: string,
  eventName: string,
): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const sameRoute = window.location.pathname === pathname;

  if (sameRoute) {
    event.preventDefault();
    if (window.location.search || window.location.hash) {
      window.history.pushState(window.history.state, '', pathname);
    }
  }

  window.dispatchEvent(new Event(eventName));

  if (sameRoute) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

export function signalScheduleFilterReset(
  event: MouseEvent<HTMLElement>,
): void {
  signalFilteredRouteReset(event, '/', RESET_SCHEDULE_FILTERS_EVENT);
}

export function signalWatchSelectionReset(
  event: MouseEvent<HTMLElement>,
): void {
  signalFilteredRouteReset(event, '/watch', RESET_WATCH_SELECTION_EVENT);
}

export function signalHistoryFilterReset(
  event: MouseEvent<HTMLElement>,
): void {
  signalFilteredRouteReset(event, '/history', RESET_HISTORY_FILTERS_EVENT);
}

export interface PrimaryNavItem {
  href: string;
  label: string;
  code: string;
  descriptor: string;
  icon: LucideIcon;
  showLiveStatus?: boolean;
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    href: '/',
    label: 'Home',
    code: '01',
    descriptor: 'Schedule',
    icon: Home,
  },
  {
    href: '/watch',
    label: 'Watch',
    code: '02',
    descriptor: 'Coverage',
    icon: Tv,
    showLiveStatus: true,
  },
  {
    href: '/history',
    label: 'History',
    code: '03',
    descriptor: 'Archive',
    icon: Archive,
  },
];

export function getPrimaryNavAccessibleLabel(
  item: PrimaryNavItem,
  liveCount: number,
): string {
  if (!item.showLiveStatus || liveCount <= 0) return item.label;

  return `${item.label}, ${liveCount} active live signal${
    liveCount === 1 ? '' : 's'
  }`;
}

export function isNavItemActive(
  pathname: string,
  href: string,
  detailSource: string | null = null,
): boolean {
  if (pathname.startsWith('/launch/')) {
    const detailParent =
      detailSource === 'watch'
        ? '/watch'
        : detailSource === 'history'
          ? '/history'
          : '/';

    return href === detailParent;
  }

  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
