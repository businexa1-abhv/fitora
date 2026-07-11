import {
  LayoutDashboard,
  IndianRupee,
  CalendarDays,
  Building2,
  Clock,
  BadgeCheck,
  GraduationCap,
  UserCog,
  FileText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface OwnerNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface OwnerNavGroup {
  title: string;
  items: OwnerNavItem[];
}

export const OWNER_NAV: OwnerNavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/owner', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/owner/revenue', label: 'Revenue', icon: IndianRupee },
      { href: '/owner/bookings', label: 'Bookings', icon: CalendarDays },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/owner/courts', label: 'Manage Courts', icon: Building2 },
      { href: '/owner/slots', label: 'Manage Slots', icon: Clock },
      { href: '/owner/memberships', label: 'Membership Plans', icon: BadgeCheck },
      { href: '/owner/training', label: 'Kids Training', icon: GraduationCap },
      { href: '/owner/trainers', label: 'Assign Trainers', icon: UserCog },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/owner/reports', label: 'Reports', icon: FileText },
      { href: '/owner/settings', label: 'Settings', icon: Settings },
    ],
  },
];
