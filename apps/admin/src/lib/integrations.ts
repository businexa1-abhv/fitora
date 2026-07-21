import { apiFetch } from './api';

export type ConnectionStatus = 'connected' | 'degraded' | 'failed' | 'disconnected';

export interface IntegrationSummary {
  connectedProviders: number;
  totalProviders: number;
  /** 0–100 percentage of syncs succeeding in the current window */
  syncHealth: number;
  failedSyncs: number;
  openConflicts: number;
  retryQueue: number;
  p95SyncLatencyMs: number | null;
}

export interface IntegrationConnection {
  id: string;
  provider: string;
  venueName: string | null;
  status: ConnectionStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  latencyMs: number | null;
  failedJobs: number;
}

export interface FailedSyncJob {
  id: string;
  integrationId: string;
  provider: string;
  eventType: string;
  externalRef: string | null;
  slotLabel: string | null;
  attempts: number;
  maxAttempts: number | null;
  error: string;
  nextRetryAt: string | null;
}

export type ConflictType = 'duplicate_booking' | 'version_mismatch' | string;

export interface IntegrationConflict {
  id: string;
  type: ConflictType;
  source: string;
  slotLabel: string | null;
  detectedAt: string;
  details: string;
  canResolve: boolean;
}

export interface IntegrationManagerData {
  summary: IntegrationSummary;
  connections: IntegrationConnection[];
  failedSyncs: FailedSyncJob[];
  conflicts: IntegrationConflict[];
}

export type ConflictResolution = 'resolve' | 'ignore';

export function getIntegrationManager(token: string) {
  return apiFetch<IntegrationManagerData>('/integrations/manager', {}, token);
}

export function resyncIntegrations(token: string, integrationId?: string) {
  return apiFetch<{ queued: boolean }>(
    '/integrations/resync',
    {
      method: 'POST',
      body: JSON.stringify(integrationId ? { integrationId } : {}),
    },
    token,
  );
}

export function retrySyncJob(token: string, jobId: string) {
  return apiFetch<{ retried: boolean }>(
    `/integrations/sync-jobs/${jobId}/retry`,
    { method: 'POST' },
    token,
  );
}

export function resolveConflict(token: string, conflictId: string, resolution: ConflictResolution) {
  return apiFetch<{ resolved: boolean }>(
    `/integrations/conflicts/${conflictId}/resolve`,
    { method: 'POST', body: JSON.stringify({ resolution }) },
    token,
  );
}
