'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Layers, RefreshCw, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAccessToken } from '@/lib/auth';
import {
  getQueueDashboard,
  listDeadLetterJobs,
  listQueueJobs,
  retryDeadLetterJob,
  triggerQueueJob,
  type DeadLetterJob,
  type QueueDashboard,
} from '@/lib/queue';

const JOB_LABELS: Record<string, string> = {
  'booking-reminder': 'Booking reminders',
  'membership-expiring': 'Membership expiring warnings',
  'membership-expiry': 'Membership expiry',
  'training-reminder': 'Training reminders',
  'payment-retry': 'Payment retry',
  'daily-reports': 'Daily reports',
  'analytics-aggregation': 'Analytics aggregation',
  'process-scheduled-broadcasts': 'Scheduled broadcasts',
};

export default function QueuesPage() {
  const [dashboard, setDashboard] = useState<QueueDashboard | null>(null);
  const [deadLetter, setDeadLetter] = useState<DeadLetterJob[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [dash, dlq, jobList] = await Promise.all([
        getQueueDashboard(token),
        listDeadLetterJobs(token),
        listQueueJobs(token),
      ]);
      setDashboard(dash);
      setDeadLetter(dlq.items);
      setJobs(jobList.jobs);
      setPatterns(jobList.patterns);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function handleRetryDlq(id: string) {
    const token = getAccessToken();
    if (!token) return;
    setActionMsg('');
    try {
      const res = await retryDeadLetterJob(token, id);
      setActionMsg(`Retried ${res.jobName} on ${res.sourceQueue}`);
      await load();
    } catch {
      setActionMsg('Retry failed');
    }
  }

  async function handleTriggerJob(jobName: string) {
    const token = getAccessToken();
    if (!token) return;
    setActionMsg('');
    try {
      await triggerQueueJob(token, jobName);
      setActionMsg(`Triggered ${jobName}`);
      await load();
    } catch {
      setActionMsg(`Failed to trigger ${jobName}`);
    }
  }

  const modeLabel =
    dashboard?.mode === 'bullmq'
      ? 'BullMQ active (Redis connected)'
      : 'Inline mode — jobs run synchronously (dev / no Redis)';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Queues"
        description="BullMQ workers, retry strategy, and dead letter queue monitoring"
        actions={
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={dashboard?.mode === 'bullmq' ? 'default' : 'secondary'}>{modeLabel}</Badge>
        {dashboard && (
          <Badge variant="outline">
            Redis: {dashboard.redisConnected ? 'connected' : 'unavailable'}
          </Badge>
        )}
      </div>

      {actionMsg && <p className="text-sm text-muted-foreground">{actionMsg}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dashboard?.queues.map((q) => (
          <Card key={q.name}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {q.label}
              </CardTitle>
              <CardDescription className="truncate text-xs">{q.name}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Waiting</span>
                <p className="font-semibold">{q.counts.waiting ?? 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Active</span>
                <p className="font-semibold">{q.counts.active ?? 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Completed</span>
                <p className="font-semibold">{q.counts.completed ?? 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Failed</span>
                <p className="font-semibold text-destructive">{q.counts.failed ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Dead letter queue
          </CardTitle>
          <CardDescription>
            Jobs that exhausted retries (exponential backoff). Retry manually after fixing the root cause.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deadLetter.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dead letter jobs.</p>
          ) : (
            <div className="space-y-3">
              {deadLetter.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">
                      {job.originalJobName}{' '}
                      <span className="text-muted-foreground">from {job.sourceQueue}</span>
                    </p>
                    <p className="truncate text-sm text-destructive">{job.failedReason}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.failedAt} · {job.attemptsMade} attempts
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetryDlq(job.id)}
                    disabled={dashboard?.mode !== 'bullmq'}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
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
          <CardTitle>Scheduled jobs</CardTitle>
          <CardDescription>Cron-triggered background workers — trigger manually for testing.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {jobs.map((job) => (
              <div
                key={job}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{JOB_LABELS[job] ?? job}</p>
                  <p className="text-xs text-muted-foreground">
                    Cron: {patterns[job] ?? '—'}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleTriggerJob(job)}>
                  Run
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
