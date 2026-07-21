'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CopyX,
  GitCompareArrows,
  ListX,
  Plug,
  PlugZap,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { QueryBoundary } from '@/components/admin/query-boundary';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthToken } from '@/hooks/use-auth-token';
import { cn } from '@/lib/utils';
import {
  getIntegrationManager,
  resolveConflict,
  resyncIntegrations,
  retrySyncJob,
  type ConflictResolution,
  type ConnectionStatus,
  type IntegrationConflict,
  type IntegrationConnection,
} from '@/lib/integrations';

const STATUS_META: Record<
  ConnectionStatus,
  { label: string; icon: LucideIcon; dot: string; bar: string; text: string; badge: string }
> = {
  connected: {
    label: 'Connected',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge:
      'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertTriangle,
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    badge:
      'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    badge: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  disconnected: {
    label: 'Disconnected',
    icon: PlugZap,
    dot: 'bg-muted-foreground/40',
    bar: 'bg-muted-foreground/30',
    text: 'text-muted-foreground',
    badge: 'border-transparent bg-muted text-muted-foreground',
  },
};

const CONFLICT_META: Record<string, { label: string; icon: LucideIcon; badge: string }> = {
  duplicate_booking: {
    label: 'Duplicate booking',
    icon: CopyX,
    badge: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  version_mismatch: {
    label: 'Version mismatch',
    icon: GitCompareArrows,
    badge:
      'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

function statusMeta(status: ConnectionStatus) {
  return STATUS_META[status] ?? STATUS_META.disconnected;
}

function conflictMeta(type: string) {
  return (
    CONFLICT_META[type] ?? {
      label: humanize(type),
      icon: ShieldAlert,
      badge: 'border-transparent bg-muted text-muted-foreground',
    }
  );
}

function humanize(value: string) {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '—';
  const abs = Math.abs(diffMs);
  const suffix = diffMs >= 0 ? ' ago' : ' from now';
  if (abs < 45_000) return diffMs >= 0 ? 'just now' : 'in <1m';
  const minutes = Math.round(abs / 60_000);
  if (minutes < 60) return diffMs >= 0 ? `${minutes}m${suffix}` : `in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return diffMs >= 0 ? `${hours}h${suffix}` : `in ${hours}h`;
  const days = Math.round(hours / 24);
  return diffMs >= 0 ? `${days}d${suffix}` : `in ${days}d`;
}

function formatLatency(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Compact per-provider health strip: instant green/amber/red state + last-sync recency. */
function ChannelHealthStrip({ connections }: { connections: IntegrationConnection[] }) {
  if (connections.length === 0) return null;
  return (
    <div
      className="flex flex-wrap items-stretch gap-1.5 rounded-lg border bg-card p-1.5"
      role="list"
      aria-label="Channel health"
    >
      {connections.map((conn) => {
        const meta = statusMeta(conn.status);
        return (
          <div
            key={conn.id}
            role="listitem"
            title={`${conn.provider}: ${meta.label} · last sync ${timeAgo(conn.lastSuccessAt)}`}
            className="flex min-w-0 flex-1 basis-32 items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} aria-hidden />
            <span className="truncate text-xs font-medium">{conn.provider}</span>
            <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {timeAgo(conn.lastSuccessAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}

export default function IntegrationsPage() {
  const token = useAuthToken();
  const [actionMsg, setActionMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['admin', 'integrations', 'manager'],
    queryFn: () => getIntegrationManager(token!),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const withBusy = useCallback(async (id: string, run: () => Promise<void>) => {
    setBusyIds((prev) => new Set(prev).add(id));
    setActionMsg(null);
    try {
      await run();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  async function handleResync(integrationId?: string, providerName?: string) {
    if (!token) return;
    const busyKey = integrationId ?? 'resync-all';
    await withBusy(busyKey, async () => {
      try {
        await resyncIntegrations(token, integrationId);
        setActionMsg({
          text: integrationId
            ? `Resync queued for ${providerName ?? 'provider'}`
            : 'Full resync queued for all providers',
          error: false,
        });
        await query.refetch();
      } catch (err) {
        setActionMsg({
          text: err instanceof Error ? err.message : 'Resync failed',
          error: true,
        });
      }
    });
  }

  async function handleRetry(jobId: string) {
    if (!token) return;
    await withBusy(jobId, async () => {
      try {
        await retrySyncJob(token, jobId);
        setActionMsg({ text: 'Retry queued', error: false });
        await query.refetch();
      } catch (err) {
        setActionMsg({
          text: err instanceof Error ? err.message : 'Retry failed',
          error: true,
        });
      }
    });
  }

  async function handleConflict(conflict: IntegrationConflict, resolution: ConflictResolution) {
    if (!token) return;
    await withBusy(`${conflict.id}:${resolution}`, async () => {
      try {
        await resolveConflict(token, conflict.id, resolution);
        setActionMsg({
          text: resolution === 'resolve' ? 'Conflict resolved' : 'Conflict ignored',
          error: false,
        });
        await query.refetch();
      } catch (err) {
        setActionMsg({
          text: err instanceof Error ? err.message : 'Could not update conflict',
          error: true,
        });
      }
    });
  }

  const data = query.data;
  const summary = data?.summary;
  const connections = data?.connections ?? [];
  const failedSyncs = data?.failedSyncs ?? [];
  const conflicts = data?.conflicts ?? [];

  const kpis = summary
    ? [
        {
          label: 'Connected Providers',
          value: `${summary.connectedProviders}/${summary.totalProviders}`,
          change:
            summary.connectedProviders < summary.totalProviders
              ? `${summary.totalProviders - summary.connectedProviders} offline`
              : 'All channels online',
          changeType:
            summary.connectedProviders < summary.totalProviders
              ? ('negative' as const)
              : ('positive' as const),
          icon: Plug,
        },
        {
          label: 'Sync Health',
          value: `${Math.round(summary.syncHealth)}%`,
          change: summary.syncHealth >= 99 ? 'Healthy' : 'Below target (99%)',
          changeType: summary.syncHealth >= 99 ? ('positive' as const) : ('negative' as const),
          icon: Activity,
        },
        {
          label: 'Failed Syncs',
          value: String(summary.failedSyncs),
          change: summary.failedSyncs > 0 ? 'Needs attention' : 'None in window',
          changeType: summary.failedSyncs > 0 ? ('negative' as const) : ('neutral' as const),
          icon: ListX,
        },
        {
          label: 'Open Conflicts',
          value: String(summary.openConflicts),
          change: summary.openConflicts > 0 ? 'Duplicate-booking risk' : 'No conflicts',
          changeType: summary.openConflicts > 0 ? ('negative' as const) : ('neutral' as const),
          icon: ShieldAlert,
        },
        {
          label: 'Retry Queue',
          value: String(summary.retryQueue),
          change: summary.retryQueue > 0 ? 'Awaiting retry' : 'Queue empty',
          changeType: 'neutral' as const,
          icon: Clock,
        },
        {
          label: 'p95 Sync Latency',
          value: formatLatency(summary.p95SyncLatencyMs),
          icon: Timer,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration Manager"
        description="Monitor connected booking channels and resolve synchronization issues."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => handleResync()}
              disabled={busyIds.has('resync-all') || query.isLoading || connections.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              Resync all
            </Button>
          </div>
        }
      />

      {actionMsg && (
        <p
          role="status"
          className={cn('text-sm', actionMsg.error ? 'text-destructive' : 'text-muted-foreground')}
        >
          {actionMsg.text}
        </p>
      )}

      <QueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
        skeleton={<LoadingSkeleton />}
      >
        <div className="space-y-6">
          <ChannelHealthStrip connections={connections} />

          {summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {kpis.map((kpi) => (
                <StatCard key={kpi.label} {...kpi} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Summary metrics are unavailable right now.
            </p>
          )}

          <section aria-labelledby="provider-connections">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="provider-connections" className="text-base font-semibold">
                Provider connections
              </h2>
              <span className="text-xs text-muted-foreground">
                {connections.length} channel{connections.length === 1 ? '' : 's'}
              </span>
            </div>

            {connections.length === 0 ? (
              <EmptyState
                icon={Plug}
                title="No providers connected"
                description="Once booking channels (Playo, PlayArena, venue sites, kiosks) are connected, their sync status appears here."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {connections.map((conn) => {
                  const meta = statusMeta(conn.status);
                  const StatusIcon = meta.icon;
                  return (
                    <Card key={conn.id} className="overflow-hidden">
                      <div className={cn('h-1', meta.bar)} aria-hidden />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="truncate text-sm font-semibold">
                              {conn.provider}
                            </CardTitle>
                            <CardDescription className="truncate text-xs">
                              {conn.venueName ?? 'All venues'}
                            </CardDescription>
                          </div>
                          <Badge className={cn('shrink-0 gap-1', meta.badge)}>
                            <StatusIcon className="h-3 w-3" aria-hidden />
                            {meta.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">Last successful sync</dt>
                            <dd className="font-medium tabular-nums">
                              {timeAgo(conn.lastSuccessAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Last failure</dt>
                            <dd
                              className={cn(
                                'font-medium tabular-nums',
                                conn.lastFailureAt && 'text-red-600 dark:text-red-400',
                              )}
                            >
                              {conn.lastFailureAt ? timeAgo(conn.lastFailureAt) : 'none'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Latency</dt>
                            <dd className="font-medium tabular-nums">
                              {formatLatency(conn.latencyMs)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Failed jobs</dt>
                            <dd
                              className={cn(
                                'font-medium tabular-nums',
                                conn.failedJobs > 0 && 'text-red-600 dark:text-red-400',
                              )}
                            >
                              {conn.failedJobs}
                            </dd>
                          </div>
                        </dl>
                        {conn.lastError && (
                          <p
                            className="truncate rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300"
                            title={conn.lastError}
                          >
                            {conn.lastError}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleResync(conn.id, conn.provider)}
                          disabled={busyIds.has(conn.id) || conn.status === 'disconnected'}
                        >
                          <RotateCcw
                            className={cn('h-4 w-4', busyIds.has(conn.id) && 'animate-spin')}
                          />
                          Resync
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Failed syncs &amp; retry queue
              </CardTitle>
              <CardDescription>
                Sync jobs that failed and are awaiting retry. Retry manually after fixing the
                underlying issue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failedSyncs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No failed syncs — all channels are processing normally.
                </p>
              ) : (
                <div className="space-y-3">
                  {failedSyncs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">
                          {humanize(job.eventType)}{' '}
                          <span className="text-muted-foreground">via {job.provider}</span>
                        </p>
                        <p className="truncate text-sm text-destructive" title={job.error}>
                          {job.error}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.slotLabel && <>{job.slotLabel} · </>}
                          {job.externalRef && <>ref {job.externalRef} · </>}
                          {job.attempts}
                          {job.maxAttempts != null && `/${job.maxAttempts}`} attempts · next retry{' '}
                          {job.nextRetryAt ? timeAgo(job.nextRetryAt) : 'manual only'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleRetry(job.id)}
                        disabled={busyIds.has(job.id)}
                      >
                        <RotateCcw
                          className={cn('h-4 w-4', busyIds.has(job.id) && 'animate-spin')}
                        />
                        Retry
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Conflicts
              </CardTitle>
              <CardDescription>
                Duplicate bookings and version mismatches detected across channels. Resolve to keep
                availability consistent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open conflicts — availability is consistent across channels.
                </p>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conflict) => {
                    const meta = conflictMeta(conflict.type);
                    const ConflictIcon = meta.icon;
                    return (
                      <div
                        key={conflict.id}
                        className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn('gap-1', meta.badge)}>
                              <ConflictIcon className="h-3 w-3" aria-hidden />
                              {meta.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              from {conflict.source} · detected{' '}
                              {formatTimestamp(conflict.detectedAt)} ({timeAgo(conflict.detectedAt)}
                              )
                            </span>
                          </div>
                          {conflict.slotLabel && (
                            <p className="text-sm font-medium">{conflict.slotLabel}</p>
                          )}
                          <p className="text-sm text-muted-foreground">{conflict.details}</p>
                        </div>
                        {conflict.canResolve && (
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConflict(conflict, 'ignore')}
                              disabled={
                                busyIds.has(`${conflict.id}:ignore`) ||
                                busyIds.has(`${conflict.id}:resolve`)
                              }
                            >
                              Ignore
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleConflict(conflict, 'resolve')}
                              disabled={
                                busyIds.has(`${conflict.id}:ignore`) ||
                                busyIds.has(`${conflict.id}:resolve`)
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Resolve
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </QueryBoundary>
    </div>
  );
}
