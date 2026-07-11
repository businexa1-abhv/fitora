'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Bell, Calendar, Megaphone, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAccessToken } from '@/lib/auth';
import {
  adminBroadcast,
  cancelScheduledBroadcast,
  getNotificationQueueStatus,
  listScheduledBroadcasts,
  scheduleBroadcast,
  sendBookingReminders,
  triggerNotificationJob,
} from '@/lib/notifications';

const SCHEDULED_JOBS = [
  { id: 'booking-reminder', label: 'Booking reminders', desc: 'Every hour — ~24h before slot' },
  { id: 'membership-expiring', label: 'Membership expiring', desc: 'Daily 9:00 — 7/3/1 day warnings' },
  { id: 'membership-expiry', label: 'Membership expire', desc: 'Daily 9:30 — deactivate & notify' },
  { id: 'training-reminder', label: 'Training reminders', desc: 'Daily 8:00 — next-day sessions' },
  { id: 'payment-retry', label: 'Payment retry', desc: 'Every 15 min — retry failed payments' },
  { id: 'daily-reports', label: 'Daily reports', desc: 'Daily 6:00 — payment & overview snapshot' },
  { id: 'analytics-aggregation', label: 'Analytics aggregation', desc: 'Daily 5:00 — monthly metrics cache' },
  { id: 'process-scheduled-broadcasts', label: 'Scheduled broadcasts', desc: 'Every 5 min — due messages' },
];

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');
  const [reminderResult, setReminderResult] = useState('');
  const [queueStatus, setQueueStatus] = useState<string>('');
  const [scheduled, setScheduled] = useState<Array<{ id: string; title: string; scheduledAt: string; status: string }>>([]);

  async function loadScheduled() {
    const token = getAccessToken();
    if (!token) return;
    const res = await listScheduledBroadcasts(token);
    setScheduled(res.items);
  }

  async function loadQueueStatus() {
    const token = getAccessToken();
    if (!token) return;
    const res = await getNotificationQueueStatus(token);
    if (res.mode === 'inline') {
      setQueueStatus('Inline mode (Redis unavailable — jobs run synchronously in dev)');
      return;
    }
    const waiting = res.queues?.reduce((sum, q) => sum + (q.counts.waiting ?? 0), 0) ?? 0;
    const failed = res.queues?.reduce((sum, q) => sum + (q.counts.failed ?? 0), 0) ?? 0;
    const dlq = res.deadLetter?.waiting ?? 0;
    setQueueStatus(
      `BullMQ active — ${waiting} waiting, ${failed} failed, ${dlq} in dead letter queue. See Job Queues for full dashboard.`,
    );
  }

  useEffect(() => {
    loadScheduled().catch(() => undefined);
    loadQueueStatus().catch(() => undefined);
  }, []);

  async function handleBroadcast(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    setResult('');
    try {
      const res = await adminBroadcast(token, {
        title,
        body,
        roles: role ? [role] : undefined,
        channels: ['IN_APP', 'EMAIL', 'SMS', 'PUSH'],
      });
      setResult(`Sent to ${res.sent} users`);
      setTitle('');
      setBody('');
    } catch {
      setResult('Broadcast failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchedule(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !scheduledAt) return;
    setSubmitting(true);
    setResult('');
    try {
      await scheduleBroadcast(token, {
        title,
        body,
        scheduledAt: new Date(scheduledAt).toISOString(),
        roles: role ? [role] : undefined,
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
      });
      setResult('Broadcast scheduled');
      setTitle('');
      setBody('');
      setScheduledAt('');
      await loadScheduled();
    } catch {
      setResult('Schedule failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReminders() {
    const token = getAccessToken();
    if (!token) return;
    const res = await sendBookingReminders(token);
    setReminderResult(`Sent ${res.sent} reminders (checked ${res.checked} bookings)`);
  }

  async function runJob(jobName: string) {
    const token = getAccessToken();
    if (!token) return;
    await triggerNotificationJob(token, jobName);
    setReminderResult(`Triggered job: ${jobName}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Multi-channel delivery — FCM, email, SMS, in-app — powered by BullMQ"
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Queue status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{queueStatus || 'Loading…'}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => loadQueueStatus()}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="broadcast">
        <TabsList>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="jobs">Background jobs</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled list</TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Admin broadcast</CardTitle>
              <CardDescription>Send immediately via in-app, email, SMS & push</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <input
                  required
                  placeholder="Title"
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  required
                  placeholder="Message body"
                  rows={4}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <select
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">All users</option>
                  <option value="PLAYER">Players</option>
                  <option value="COURT_OWNER">Court owners</option>
                  <option value="TRAINER">Trainers</option>
                  <option value="SERVICE_PROVIDER">Service providers</option>
                  <option value="PRINTER">Printers</option>
                </select>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Sending…' : 'Send broadcast'}
                </Button>
                {result && <p className="text-sm text-muted-foreground">{result}</p>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Schedule broadcast</CardTitle>
              <CardDescription>Queue a future admin message (processed every 5 min)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSchedule} className="space-y-4">
                <input
                  required
                  placeholder="Title"
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  required
                  placeholder="Message body"
                  rows={3}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <input
                  required
                  type="datetime-local"
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <select
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">All users</option>
                  <option value="PLAYER">Players</option>
                  <option value="TRAINER">Trainers</option>
                  <option value="SERVICE_PROVIDER">Providers</option>
                  <option value="PRINTER">Printers</option>
                </select>
                <Button type="submit" disabled={submitting} className="w-full">
                  Schedule broadcast
                </Button>
                {result && <p className="text-sm text-muted-foreground">{result}</p>}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">BullMQ scheduled jobs</CardTitle>
              <CardDescription>Automatic reminders & expiry notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SCHEDULED_JOBS.map((job) => (
                <div key={job.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{job.label}</p>
                    <p className="text-xs text-muted-foreground">{job.desc}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => runJob(job.id)}>
                    Run now
                  </Button>
                </div>
              ))}
              {reminderResult && <p className="text-sm text-muted-foreground">{reminderResult}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual booking reminders</CardTitle>
              <CardDescription>~24 hours before confirmed bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleReminders}>
                Send booking reminders now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheduled broadcasts</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {scheduled.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">No scheduled broadcasts</p>
              )}
              {scheduled.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 gap-4">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.scheduledAt).toLocaleString()} · {item.status}
                    </p>
                  </div>
                  {item.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const token = getAccessToken();
                        if (token) {
                          await cancelScheduledBroadcast(token, item.id);
                          await loadScheduled();
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
