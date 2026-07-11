import { DashboardLayout } from '@/components/admin/dashboard-layout';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
