'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Building2,
  CalendarDays,
  IndianRupee,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { ROLE_LABELS } from '@fitora/shared';
import { StatCard } from '@/components/admin/stat-card';
import { PageHeader } from '@/components/admin/page-header';
import { QueryBoundary } from '@/components/admin/query-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUsers } from '@/lib/api';
import { getAdminBookings } from '@/lib/dashboard-api';
import { getAnalyticsDashboard } from '@/lib/analytics';
import { getStoredUser } from '@/lib/auth';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/admin/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const user = getStoredUser();
  const token = useAuthToken();

  const monthlyQuery = useQuery({
    queryKey: ['admin', 'analytics', 'monthly'],
    queryFn: () => getAnalyticsDashboard(token!, { period: 'monthly' }),
    enabled: !!token,
  });

  const dailyQuery = useQuery({
    queryKey: ['admin', 'analytics', 'daily'],
    queryFn: () => getAnalyticsDashboard(token!, { period: 'daily' }),
    enabled: !!token,
  });

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUsers(token!),
    enabled: !!token,
  });

  const bookingsQuery = useQuery({
    queryKey: ['admin', 'bookings', 'recent'],
    queryFn: () => getAdminBookings(token!, { page: 1, pageSize: 4 }),
    enabled: !!token,
  });

  const isLoading = monthlyQuery.isLoading || dailyQuery.isLoading;
  const isError = monthlyQuery.isError || dailyQuery.isError;
  const error = monthlyQuery.error ?? dailyQuery.error;

  const monthly = monthlyQuery.data?.overview;
  const daily = dailyQuery.data?.overview;

  const stats = [
    {
      label: 'Total Users',
      value: usersQuery.data ? String(usersQuery.data.length) : '—',
      change: monthly ? `${monthly.newUsers} new this month` : undefined,
      changeType: 'positive' as const,
      icon: Users,
    },
    {
      label: 'Active Courts',
      value: monthly?.activeCourts != null ? String(monthly.activeCourts) : '—',
      change: monthly?.pendingCourts ? `${monthly.pendingCourts} pending approval` : undefined,
      changeType: 'neutral' as const,
      icon: Building2,
    },
    {
      label: 'Bookings Today',
      value: daily ? String(daily.totalBookings) : '—',
      icon: CalendarDays,
    },
    {
      label: 'Revenue (MTD)',
      value: monthly ? formatCurrency(monthly.totalRevenue) : '—',
      icon: IndianRupee,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'Admin'}`}
        description="Platform overview and recent activity"
        actions={
          <Button asChild>
            <Link href="/analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              View analytics
            </Link>
          </Button>
        }
      />

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error as Error}
        onRetry={() => {
          monthlyQuery.refetch();
          dailyQuery.refetch();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </QueryBoundary>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent bookings</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bookings">
                View all <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <QueryBoundary
              isLoading={bookingsQuery.isLoading}
              isError={bookingsQuery.isError}
              error={bookingsQuery.error as Error}
              onRetry={() => bookingsQuery.refetch()}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsQuery.data?.items.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        {b.user ? `${b.user.firstName} ${b.user.lastName}` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.court.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {bookingsQuery.data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No bookings yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </QueryBoundary>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              {
                href: '/courts',
                label: 'Approve courts',
                desc: `${monthly?.pendingCourts ?? 0} pending`,
                icon: Building2,
              },
              { href: '/users', label: 'Manage users', desc: 'View all accounts', icon: Users },
              { href: '/products', label: 'Shop products', desc: 'Catalog management', icon: IndianRupee },
              { href: '/settings', label: 'Platform settings', desc: 'Configure system', icon: TrendingUp },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <Badge key={role} variant="secondary" className="px-3 py-1">
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
