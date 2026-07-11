import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export interface ProviderNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PROVIDER_NAV: ProviderNavItem[] = [
  { href: '/provider', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/provider/orders', label: 'Orders', icon: ClipboardList },
  { href: '/provider/listings', label: 'Listings', icon: Wrench },
  { href: '/provider/notifications', label: 'Notifications', icon: Bell },
];
