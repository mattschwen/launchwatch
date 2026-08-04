import { Archive, Home, Tv, type LucideIcon } from 'lucide-react';
import type { MouseEvent } from 'react';

export const RESET_SCHEDULE_FILTERS_EVENT =
  'launchwatch:reset-schedule-filters';

export function signalScheduleFilterReset(
  event: MouseEvent<HTMLElement>,
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

  window.dispatchEvent(new Event(RESET_SCHEDULE_FILTERS_EVENT));
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
