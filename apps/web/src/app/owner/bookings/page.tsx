'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatusBadge } from '@/components/owner/owner-status-badge';
import { QueryBoundary } from '@/components/query/query-boundary';
import { DataPagination } from '@/components/query/data-pagination';
import { SortableTh, toggleSort } from '@/components/query/sortable-table-head';
import { getOwnerBookings } from '@/lib/owner-bookings';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency, formatTime } from '@/lib/owner-utils';

const PAGE_SIZE = 20;

export default function OwnerBookingsPage() {
  const token = useAuthToken();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebouncedValue(search);

  const status = filter === 'ALL' ? undefined : filter;

  const query = useQuery({
    queryKey: ['owner', 'bookings', page, debouncedSearch, status, sortBy, sortOrder],
    queryFn: () =>
      getOwnerBookings(token!, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status,
        sortBy,
        sortOrder,
      }),
    enabled: !!token,
  });

  const handleSort = (field: string) => {
    const next = toggleSort(field, sortBy, sortOrder);
    setSortBy(next.sortBy);
    setSortOrder(next.sortOrder);
  };

  const tabs = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  return (
    <div>
      <OwnerPageHeader
        title="Bookings"
        description={
          query.data
            ? `${query.data.total} total bookings across your courts`
            : 'Bookings across your courts'
        }
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search bookings…"
      />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setFilter(tab);
              setPage(1);
            }}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted hover:text-foreground'
            }`}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <QueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {query.data?.items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted opacity-50" />
            <p className="text-lg font-semibold mt-4">No bookings yet</p>
            <p className="text-sm text-muted mt-1">
              Bookings will appear here once players reserve slots
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary-light/40 border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold">User</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Court</th>
                    <SortableTh
                      label="Time"
                      field="createdAt"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Amount"
                      field="totalAmount"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data?.items.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-border last:border-0 hover:bg-primary-light/10"
                    >
                      <td className="px-5 py-4 font-medium">
                        {b.user ? `${b.user.firstName} ${b.user.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-4">{b.court.name}</td>
                      <td className="px-5 py-4 text-muted">{formatTime(b.slot.startTime)}</td>
                      <td className="px-5 py-4">{formatCurrency(Number(b.totalAmount))}</td>
                      <td className="px-5 py-4">
                        <OwnerStatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {query.data && (
              <DataPagination
                page={query.data.page}
                totalPages={query.data.totalPages}
                total={query.data.total}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
