import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Bell,
  Image,
  type LucideIcon,
} from 'lucide-react';

export interface PrinterNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRINTER_NAV: PrinterNavItem[] = [
  { href: '/printer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/printer/orders', label: 'Pipeline', icon: ClipboardList },
  { href: '/printer/proofs', label: 'Proofs', icon: Image },
  { href: '/printer/listings', label: 'Listings', icon: Package },
  { href: '/printer/notifications', label: 'Notifications', icon: Bell },
];
