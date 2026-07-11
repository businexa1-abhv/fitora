'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { QueryBoundary } from '@/components/admin/query-boundary';
import { DataPagination } from '@/components/admin/data-pagination';
import { SortableTableHead, useSortState } from '@/components/admin/sortable-table-head';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAdminBookings } from '@/lib/dashboard-api';
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

export default function BookingsPage() {
  const token = useAuthToken();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebouncedValue(search);
  const handleSort = useSortState(setSortBy, setSortOrder, sortBy, sortOrder);

  const status = tab === 'all' ? undefined : tab.toUpperCase();

  const query = useQuery({
    queryKey: ['admin', 'bookings', page, debouncedSearch, status, sortBy, sortOrder],
    queryFn: () =>
      getAdminBookings(token!, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status,
        sortBy,
        sortOrder,
      }),
    enabled: !!token,
  });

  return (
    <div>
      <PageHeader
        title="Bookings"
        description={
          query.data ? `${query.data.total} total bookings` : 'Court bookings across the platform'
        }
        searchPlaceholder="Search bookings…"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
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
                    <TableHead>User</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>City</TableHead>
                    <SortableTableHead
                      label="Date & Time"
                      field="createdAt"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableTableHead
                      label="Amount"
                      field="totalAmount"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableTableHead
                      label="Status"
                      field="status"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data?.items.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        {b.user ? `${b.user.firstName} ${b.user.lastName}` : '—'}
                      </TableCell>
                      <TableCell>{b.court.name}</TableCell>
                      <TableCell className="text-muted-foreground">{b.court.city}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(b.slot.startTime)} ·{' '}
                        {new Date(b.slot.startTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(b.totalAmount))}</TableCell>
                      <TableCell>
                        <StatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {query.data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No bookings found
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
