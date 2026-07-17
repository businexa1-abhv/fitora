import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Bell,
  CalendarDays,
  Star,
  Wallet,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface ProviderNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PROVIDER_NAV: ProviderNavItem[] = [
  { href: '/provider', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/provider/listings', label: 'Listings', icon: Wrench },
  { href: '/provider/orders', label: 'Orders', icon: ClipboardList },
  { href: '/provider/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/provider/reviews', label: 'Reviews', icon: Star },
  { href: '/provider/payouts', label: 'Payouts', icon: Wallet },
  { href: '/provider/notifications', label: 'Notifications', icon: Bell },
  { href: '/provider/settings', label: 'Settings', icon: Settings },
];
