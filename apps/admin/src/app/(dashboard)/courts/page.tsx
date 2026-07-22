'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { SPORT_LABELS, type Court, type SportType } from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  approveCourt,
  getAdminVenues,
  getPendingCourts,
  type AdminVenue,
  type AdminVenueCourt,
} from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

const PAGE_SIZE = 20;

function approvalBadge(status: AdminVenueCourt['approvalStatus']) {
  if (status === 'APPROVED') {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
  }
  if (status === 'REJECTED') {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary">Pending</Badge>;
}

function tenantStatusBadge(venue: AdminVenue) {
  if (venue.status === 'ACTIVE' && venue.isActive) {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>;
  }
  if (venue.status === 'SUSPENDED') {
    return <Badge variant="destructive">Suspended</Badge>;
  }
  return <Badge variant="secondary">{venue.status}</Badge>;
}

function VenueCard({ venue }: { venue: AdminVenue }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center justify-between gap-4 p-6 text-left"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-lg">
              {venue.name}
              {tenantStatusBadge(venue)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {venue.city ?? '—'} · {venue.courtCount} court{venue.courtCount === 1 ? '' : 's'} ·{' '}
              {venue.approvedCourtCount} approved
              {venue.pendingCourtCount > 0 ? ` · ${venue.pendingCourtCount} pending` : ''}
            </p>
            {venue.owner && (
              <p className="mt-1 text-xs text-muted-foreground">
                Owner: {venue.owner.firstName} {venue.owner.lastName} ({venue.owner.email})
              </p>
            )}
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <CardContent className="border-t p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Court</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Price/slot</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venue.courts.map((court) => (
                <TableRow key={court.id}>
                  <TableCell className="font-medium">{court.name}</TableCell>
                  <TableCell>{court.sport?.name ?? '—'}</TableCell>
                  <TableCell>
                    {court.defaultSlotPrice ? `₹${court.defaultSlotPrice}` : '—'}
                  </TableCell>
                  <TableCell>{court.defaultSlotCapacity}</TableCell>
                  <TableCell>{approvalBadge(court.approvalStatus)}</TableCell>
                  <TableCell>
                    {court.isActive ? (
                      <Badge variant="outline">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

function VenuesTab() {
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminVenues(token, {
        search: query || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setVenues(result.items);
      setTotal(result.total);
      setTotalPages(Math.max(1, result.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venues');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search venues by name or city"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <EmptyState icon={Building2} title="Failed to load venues" description={error} />
      )}

      {!loading && !error && venues.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No venues found"
          description={query ? `No venues match "${query}"` : 'No venues with courts yet'}
        />
      )}

      <div className="space-y-4">
        {!loading && !error && venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
      </div>

      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} venue{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    getPendingCourts(token)
      .then(setCourts)
      .catch(() => setCourts([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(courtId: string) {
    const token = getAccessToken();
    if (!token) return;

    setApprovingId(courtId);
    try {
      await approveCourt(token, courtId);
      setCourts((prev) => prev.filter((c) => c.id !== courtId));
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Venues & Courts"
        description="Browse venues, review their courts, and handle approvals"
      />

      <Tabs defaultValue="venues">
        <TabsList>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="pending">Pending approval ({courts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="mt-6">
          <VenuesTab />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {!loading && courts.length === 0 && (
            <EmptyState
              icon={Building2}
              title="All caught up!"
              description="No courts pending approval"
            />
          )}

          <div className="space-y-4">
            {courts.map((court) => (
              <Card key={court.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{court.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {court.sportType
                          ? (SPORT_LABELS[court.sportType as SportType] ?? court.sportType)
                          : 'Sport'}{' '}
                        · {court.city}
                      </p>
                      {court.owner && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Owner: {court.owner.firstName} {court.owner.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleApprove(court.id)}
                    disabled={approvingId === court.id}
                  >
                    {approvingId === court.id ? 'Approving…' : 'Approve'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
