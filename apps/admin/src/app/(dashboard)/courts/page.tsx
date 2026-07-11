'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { SPORT_LABELS, type Court, type SportType } from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { approveCourt, getPendingCourts } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

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
        title="Courts"
        description="Manage court listings and approvals"
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({courts.length})</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="all">All courts</TabsTrigger>
        </TabsList>

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
                        {court.sportType ? SPORT_LABELS[court.sportType as SportType] : 'Sport'} · {court.city}
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

        <TabsContent value="active" className="mt-6">
          <EmptyState
            icon={Building2}
            title="Active courts"
            description="Connect to courts API for full listing"
          />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card className="p-6">
            <Badge variant="secondary">Coming soon</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Full court management with search, filters, and bulk actions.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
