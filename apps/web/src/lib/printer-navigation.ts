import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export interface PrinterNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRINTER_NAV: PrinterNavItem[] = [
  { href: '/printer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/printer/orders', label: 'Orders', icon: ClipboardList },
  { href: '/printer/listings', label: 'Listings', icon: Package },
  { href: '/printer/notifications', label: 'Notifications', icon: Bell },
];
