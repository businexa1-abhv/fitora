import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Wallet,
  Package,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  BadgeCheck,
  Bell,
  Layers,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Platform',
    items: [
      { href: '/users', label: 'Users', icon: Users },
      { href: '/courts', label: 'Courts', icon: Building2 },
      { href: '/bookings', label: 'Bookings', icon: CalendarDays },
      { href: '/memberships', label: 'Memberships', icon: BadgeCheck },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/payments', label: 'Payments', icon: Wallet },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/shop-orders', label: 'Shop Orders', icon: FileText },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/shop-coupons', label: 'Coupons', icon: BadgeCheck },
      { href: '/services', label: 'Services', icon: Wrench },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: '/reports', label: 'Reports', icon: FileText },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/queues', label: 'Job Queues', icon: Layers },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS = ADMIN_NAV.flatMap((g) => g.items);
