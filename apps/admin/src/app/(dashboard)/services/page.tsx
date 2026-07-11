'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { QueryBoundary } from '@/components/admin/query-boundary';
import { DataPagination } from '@/components/admin/data-pagination';
import { SortableTableHead, useSortState } from '@/components/admin/sortable-table-head';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAdminPrintOrders, getAdminServiceListings } from '@/lib/dashboard-api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 20;

export default function ServicesPage() {
  const token = useAuthToken();
  const [tab, setTab] = useState('services');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebouncedValue(search);
  const handleSort = useSortState(setSortBy, setSortOrder, sortBy, sortOrder);

  const listingsQuery = useQuery({
    queryKey: ['admin', 'service-listings', page, debouncedSearch, sortBy, sortOrder],
    queryFn: () =>
      getAdminServiceListings(token!, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      }),
    enabled: !!token && tab === 'services',
  });

  const printQuery = useQuery({
    queryKey: ['admin', 'print-orders', page, debouncedSearch, sortBy, sortOrder],
    queryFn: () =>
      getAdminPrintOrders(token!, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      }),
    enabled: !!token && tab === 'print',
  });

  const activeQuery = tab === 'services' ? listingsQuery : printQuery;

  return (
    <div>
      <PageHeader
        title="Services"
        description={
          activeQuery.data
            ? `${activeQuery.data.total} total ${tab === 'services' ? 'listings' : 'print orders'}`
            : 'Sports services and print marketplace'
        }
        searchPlaceholder={tab === 'services' ? 'Search services…' : 'Search print orders…'}
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
          setSearch('');
        }}
      >
        <TabsList>
          <TabsTrigger value="services">Service listings</TabsTrigger>
          <TabsTrigger value="print">Print orders</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <Card>
            <QueryBoundary
              isLoading={listingsQuery.isLoading}
              isError={listingsQuery.isError}
              error={listingsQuery.error as Error}
              onRetry={() => listingsQuery.refetch()}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>City</TableHead>
                    <SortableTableHead
                      label="Price"
                      field="price"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listingsQuery.data?.items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{s.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.provider
                          ? `${s.provider.firstName} ${s.provider.lastName}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.city}</TableCell>
                      <TableCell>{formatCurrency(Number(s.price))}</TableCell>
                      <TableCell>{s.orderCount ?? 0}</TableCell>
                      <TableCell>
                        <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {listingsQuery.data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No service listings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {listingsQuery.data && (
                <DataPagination
                  page={listingsQuery.data.page}
                  totalPages={listingsQuery.data.totalPages}
                  total={listingsQuery.data.total}
                  onPageChange={setPage}
                />
              )}
            </QueryBoundary>
          </Card>
        </TabsContent>

        <TabsContent value="print" className="mt-6">
          <Card>
            <QueryBoundary
              isLoading={printQuery.isLoading}
              isError={printQuery.isError}
              error={printQuery.error as Error}
              onRetry={() => printQuery.refetch()}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Listing</TableHead>
                    <TableHead>Qty</TableHead>
                    <SortableTableHead
                      label="Amount"
                      field="totalAmount"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printQuery.data?.items.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.orderNumber}</TableCell>
                      <TableCell>
                        {o.user ? `${o.user.firstName} ${o.user.lastName}` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {o.listing?.title ?? '—'}
                      </TableCell>
                      <TableCell>{o.quantity}</TableCell>
                      <TableCell>{formatCurrency(Number(o.totalAmount))}</TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {printQuery.data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No print orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {printQuery.data && (
                <DataPagination
                  page={printQuery.data.page}
                  totalPages={printQuery.data.totalPages}
                  total={printQuery.data.total}
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
