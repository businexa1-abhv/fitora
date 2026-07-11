import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  NotebookPen,
  FileBarChart,
  TrendingUp,
  CalendarOff,
  User,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export interface TrainerNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface TrainerNavGroup {
  title: string;
  items: TrainerNavItem[];
}

export const TRAINER_NAV: TrainerNavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/trainer', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/trainer/schedule', label: 'Schedule', icon: CalendarDays },
      { href: '/trainer/performance', label: 'Performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Training',
    items: [
      { href: '/trainer/attendance', label: 'Attendance', icon: ClipboardCheck },
      { href: '/trainer/notes', label: 'Training Notes', icon: NotebookPen },
      { href: '/trainer/progress', label: 'Progress Reports', icon: FileBarChart },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/trainer/leave', label: 'Leave Requests', icon: CalendarOff },
      { href: '/trainer/profile', label: 'Profile', icon: User },
      { href: '/trainer/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];
