'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDays,
  Download,
  IndianRupee,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  UserPlus,
} from 'lucide-react';
import type { AnalyticsDashboard, AnalyticsPeriod } from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportAnalyticsCsv, getAnalyticsDashboard } from '@/lib/analytics';
import { getAccessToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

function formatChange(pct: number) {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}%`;
}

function changeType(pct: number): 'positive' | 'negative' | 'neutral' {
  if (pct > 0) return 'positive';
  if (pct < 0) return 'negative';
  return 'neutral';
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const dashboard = await getAnalyticsDashboard(token, {
        period,
        from: from || undefined,
        to: to || undefined,
      });
      setData(dashboard);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport(metric: 'revenue' | 'bookings' | 'users' | 'overview') {
    const token = getAccessToken();
    if (!token) return;
    const blob = await exportAnalyticsCsv(token, metric, {
      period,
      from: from || undefined,
      to: to || undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitora-analytics-${metric}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const revenueChart = data?.revenue.series.map((s) => ({ label: s.label, revenue: s.value })) ?? [];
  const bookingsChart = data?.bookings.series.map((s) => ({ label: s.label, bookings: s.value })) ?? [];
  const usersChart = data?.users.series.map((s) => ({ label: s.label, users: s.value })) ?? [];
  const membershipsChart =
    data?.memberships.series.map((s) => ({ label: s.label, memberships: s.value })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Revenue, bookings, memberships, products, users, growth, and retention"
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => handleExport('overview')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue"
              value={formatCurrency(data.overview.totalRevenue)}
              icon={IndianRupee}
              change={formatChange(data.growth.revenue.changePct)}
              changeType={changeType(data.growth.revenue.changePct)}
            />
            <StatCard
              label="Bookings"
              value={String(data.overview.totalBookings)}
              icon={CalendarDays}
              change={formatChange(data.growth.bookings.changePct)}
              changeType={changeType(data.growth.bookings.changePct)}
            />
            <StatCard
              label="New users"
              value={String(data.overview.newUsers)}
              icon={UserPlus}
              change={formatChange(data.growth.users.changePct)}
              changeType={changeType(data.growth.users.changePct)}
            />
            <StatCard
              label="Retention"
              value={`${data.retention.bookingRetentionRate}%`}
              icon={TrendingUp}
              change={`${data.retention.repeatBookers} repeat`}
              changeType="neutral"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active memberships</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.overview.activeMemberships}</p>
                <p className="text-xs text-muted-foreground">{data.memberships.total} sold in period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Shop orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.overview.shopOrders}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(data.products.revenue)} revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.users.totalUsers}</p>
                <p className="text-xs text-muted-foreground">{data.retention.payingUsers} paying users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Membership revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(data.memberships.revenue)}</p>
                <p className="text-xs text-muted-foreground">{data.memberships.active} active</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Revenue</CardTitle>
                  <CardDescription>{formatCurrency(data.revenue.total)} total</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleExport('revenue')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Bookings</CardTitle>
                  <CardDescription>{data.bookings.total} confirmed</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleExport('bookings')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={bookingsChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Bar dataKey="bookings" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">User growth</CardTitle>
                  <CardDescription>{data.users.newUsers} new registrations</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleExport('users')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={usersChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="users" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: 'var(--chart-3)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Memberships</CardTitle>
                <CardDescription>{data.memberships.total} purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={membershipsChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Bar dataKey="memberships" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Top products
                </CardTitle>
                <CardDescription>Best sellers in selected period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.products.topProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No product sales in this period.</p>
                )}
                {data.products.topProducts.map((p) => (
                  <div key={p.name} className="flex justify-between border-b border-border pb-2 text-sm">
                    <span>{p.name}</span>
                    <span className="font-semibold">
                      {formatCurrency(p.revenue)} ({p.quantity} sold)
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Revenue by category
                </CardTitle>
                <CardDescription>Breakdown by payment entity type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.revenue.byEntityType.length === 0 && (
                  <p className="text-sm text-muted-foreground">No paid transactions in this period.</p>
                )}
                {data.revenue.byEntityType.map((row) => (
                  <div key={row.entityType} className="flex justify-between border-b border-border pb-2 text-sm">
                    <span>{row.label}</span>
                    <span className="font-semibold">
                      {formatCurrency(row.revenue)} ({row.count})
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Unable to load analytics. Sign in as admin and try again.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
