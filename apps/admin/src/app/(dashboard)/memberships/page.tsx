'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { QueryBoundary } from '@/components/admin/query-boundary';
import { DataPagination } from '@/components/admin/data-pagination';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAdminMemberships } from '@/lib/dashboard-api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 20;

export default function MembershipsPage() {
  const token = useAuthToken();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const status = tab === 'all' ? undefined : tab.toUpperCase();

  const query = useQuery({
    queryKey: ['admin', 'memberships', page, debouncedSearch, status],
    queryFn: () =>
      getAdminMemberships(token!, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status,
      }),
    enabled: !!token,
  });

  const stats = query.data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memberships"
        description="Membership plans and active subscriptions"
        searchPlaceholder="Search memberships…"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <QueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
        skeleton={
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Active memberships"
            value={stats ? String(stats.activeCount) : '—'}
            icon={BadgeCheck}
          />
          <StatCard
            label="Total subscriptions"
            value={stats ? String(stats.totalSubscriptions) : '—'}
            icon={BadgeCheck}
          />
          <StatCard
            label="Plans available"
            value={stats ? String(stats.planCount) : '—'}
            icon={BadgeCheck}
          />
        </div>
      </QueryBoundary>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          <Card>
            <QueryBoundary
              isLoading={query.isLoading}
              isError={query.isError}
              error={query.error as Error}
              onRetry={() => query.refetch()}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data?.items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.user ? `${m.user.firstName} ${m.user.lastName}` : '—'}
                      </TableCell>
                      <TableCell>{m.plan?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.plan?.court?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(m.startDate)} – {formatDate(m.endDate)}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(m.amountPaid))}</TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {query.data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No memberships found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {query.data && (
                <DataPagination
                  page={query.data.page}
                  totalPages={query.data.totalPages}
                  total={query.data.total}
                  onPageChange={setPage}
                />
              )}
            </QueryBoundary>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
