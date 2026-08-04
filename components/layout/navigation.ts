import { Archive, Home, Tv, type LucideIcon } from 'lucide-react';
import type { MouseEvent } from 'react';

export const RESET_SCHEDULE_FILTERS_EVENT =
  'launchwatch:reset-schedule-filters';
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

  if (
    window.location.pathname === pathname &&
    (window.location.search || window.location.hash)
  ) {
    event.preventDefault();
    window.history.pushState(window.history.state, '', pathname);
  }

  window.dispatchEvent(new Event(eventName));
}

export function signalScheduleFilterReset(
  event: MouseEvent<HTMLElement>,
): void {
  signalFilteredRouteReset(event, '/', RESET_SCHEDULE_FILTERS_EVENT);
}

export function signalHistoryFilterReset(
  event: MouseEvent<HTMLElement>,
): void {
  signalFilteredRouteReset(event, '/history', RESET_HISTORY_FILTERS_EVENT);
}

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showLiveStatus?: boolean;
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/watch', label: 'Watch', icon: Tv, showLiveStatus: true },
  { href: '/history', label: 'History', icon: Archive },
];

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
