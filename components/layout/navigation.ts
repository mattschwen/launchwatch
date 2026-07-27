import { Archive, Home, Tv, type LucideIcon } from 'lucide-react';

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

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
