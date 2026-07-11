import { apiFetch } from './api';

export interface QueueCounts {
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: number;
}

export interface QueueDashboard {
  mode: 'inline' | 'bullmq';
  redisConnected: boolean;
  queues: Array<{ name: string; label: string; counts: QueueCounts }>;
  deadLetter: {
    waiting: number;
    total: number;
    recent: DeadLetterJob[];
  };
}

export interface DeadLetterJob {
  id: string;
  sourceQueue: string;
  originalJobName: string;
  failedReason: string;
  failedAt: string;
  attemptsMade: number;
  originalJobId?: string;
}

export interface ScheduledJobsResponse {
  jobs: string[];
  patterns: Record<string, string>;
}

export function getQueueDashboard(token: string) {
  return apiFetch<QueueDashboard>('/queue/admin/dashboard', {}, token);
}

export function listDeadLetterJobs(token: string, page = 1, pageSize = 20) {
  return apiFetch<{ items: DeadLetterJob[]; total: number; page: number; pageSize: number }>(
    `/queue/admin/dead-letter?page=${page}&pageSize=${pageSize}`,
    {},
    token,
  );
}

export function retryDeadLetterJob(token: string, jobId: string) {
  return apiFetch<{ retried: boolean; sourceQueue: string; jobName: string }>(
    `/queue/admin/dead-letter/${jobId}/retry`,
    { method: 'POST' },
    token,
  );
}

export function triggerQueueJob(token: string, jobName: string) {
  return apiFetch(`/queue/admin/jobs/${jobName}/trigger`, { method: 'POST' }, token);
}

export function listQueueJobs(token: string) {
  return apiFetch<ScheduledJobsResponse>('/queue/admin/jobs', {}, token);
}
