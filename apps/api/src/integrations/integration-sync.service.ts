import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  IntegrationDirection,
  IntegrationStatus,
  IntegrationSyncJobStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { QueueManagerService } from '../queue/queue-manager.service';
import { QUEUES } from '../queue/queue.constants';
import { AdapterRegistry } from './adapters/adapter-registry.service';
import { IntegrationCryptoService } from './integration-crypto.service';

@Injectable()
export class IntegrationSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationSyncService.name);
  private retryTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueManagerService,
    private readonly adapters: AdapterRegistry,
    private readonly crypto: IntegrationCryptoService,
  ) {}

  onModuleInit() {
    this.queue.registerHandler(QUEUES.INTEGRATION_SYNC, (_name, data) =>
      this.process(String((data as { jobId: string }).jobId)),
    );
    this.retryTimer = setInterval(() => void this.dispatchDue(), 60_000);
    this.retryTimer.unref();
    void this.dispatchDue();
  }

  onModuleDestroy() {
    if (this.retryTimer) clearInterval(this.retryTimer);
  }

  async enqueueAvailability(slotId: string, payload: Record<string, unknown>, eventType: string) {
    const mappings = await this.prisma.slotChannelMapping.findMany({
      where: {
        slotId,
        isActive: true,
        integrationId: {
          in: (
            await this.prisma.integrationConnection.findMany({
              where: { status: IntegrationStatus.ACTIVE },
              select: { id: true },
            })
          ).map((row) => row.id),
        },
      },
    });
    const now = Date.now();
    for (const mapping of mappings) {
      const job = await this.prisma.integrationSyncJob.create({
        data: {
          integrationId: mapping.integrationId,
          slotId,
          direction: IntegrationDirection.OUTBOUND,
          eventType,
          payload: {
            ...payload,
            externalSlotId: mapping.externalSlotId,
          } as Prisma.InputJsonValue,
          idempotencyKey: `${eventType}:${mapping.integrationId}:${slotId}:${now}`,
        },
      });
      await this.queue.addJob(
        QUEUES.INTEGRATION_SYNC,
        'sync',
        { jobId: job.id },
        { jobId: job.id },
      );
    }
    return { queued: mappings.length };
  }

  async dispatchDue() {
    const due = await this.prisma.integrationSyncJob.findMany({
      where: {
        status: {
          in: [
            IntegrationSyncJobStatus.PENDING,
            IntegrationSyncJobStatus.RETRYING,
            IntegrationSyncJobStatus.FAILED,
          ],
        },
        nextAttemptAt: { lte: new Date() },
      },
      select: { id: true },
      take: 100,
    });
    for (const job of due) {
      try {
        await this.queue.addJob(
          QUEUES.INTEGRATION_SYNC,
          'sync',
          { jobId: job.id },
          { jobId: `${job.id}:${Date.now()}` },
        );
      } catch (error) {
        this.logger.warn(`Could not dispatch integration sync job ${job.id}: ${String(error)}`);
      }
    }
    return { dispatched: due.length };
  }

  async process(jobId: string) {
    const claimed = await this.prisma.integrationSyncJob.updateMany({
      where: {
        id: jobId,
        nextAttemptAt: { lte: new Date() },
        status: {
          in: [
            IntegrationSyncJobStatus.PENDING,
            IntegrationSyncJobStatus.RETRYING,
            IntegrationSyncJobStatus.FAILED,
          ],
        },
      },
      data: { status: IntegrationSyncJobStatus.PROCESSING, lockedAt: new Date() },
    });
    if (!claimed.count) return { skipped: true };
    const job = await this.prisma.integrationSyncJob.findUnique({ where: { id: jobId } });
    if (!job) return { skipped: true };
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id: job.integrationId },
    });
    if (!connection?.outboundEndpoint || connection.status !== IntegrationStatus.ACTIVE) {
      return this.fail(job, 'Integration is inactive or has no outbound endpoint');
    }
    try {
      const adapter = this.adapters.get(connection.provider);
      const result = await adapter.send({
        endpoint: connection.outboundEndpoint,
        idempotencyKey: job.idempotencyKey,
        payload: job.payload as Record<string, unknown>,
        credentials: connection.credentialsEncrypted
          ? this.crypto.decrypt<Record<string, unknown>>(connection.credentialsEncrypted)
          : undefined,
        webhookSecret: this.crypto.decrypt<string>(connection.webhookSecretEncrypted),
      });
      const completedAt = new Date();
      await this.prisma.$transaction([
        this.prisma.integrationSyncJob.update({
          where: { id: job.id },
          data: {
            status: IntegrationSyncJobStatus.SUCCEEDED,
            attempts: { increment: 1 },
            completedAt,
            latencyMs: result.latencyMs,
            lockedAt: null,
            lastError: null,
          },
        }),
        this.prisma.integrationConnection.update({
          where: { id: connection.id },
          data: { lastSyncAt: completedAt, lastSuccessAt: completedAt },
        }),
      ]);
      return { synced: true };
    } catch (error) {
      return this.fail(job, error instanceof Error ? error.message : 'Provider sync failed');
    }
  }

  private async fail(
    job: { id: string; integrationId: string; attempts: number; maxAttempts: number },
    message: string,
  ) {
    const attempts = job.attempts + 1;
    const exhausted = attempts >= job.maxAttempts;
    const nextAttemptAt = new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 5_000));
    await this.prisma.$transaction([
      this.prisma.integrationSyncJob.update({
        where: { id: job.id },
        data: {
          attempts,
          status: exhausted
            ? IntegrationSyncJobStatus.DEAD_LETTER
            : IntegrationSyncJobStatus.RETRYING,
          nextAttemptAt,
          lockedAt: null,
          lastError: message.slice(0, 4000),
        },
      }),
      this.prisma.integrationConnection.update({
        where: { id: job.integrationId },
        data: { lastSyncAt: new Date(), lastFailureAt: new Date() },
      }),
    ]);
    if (!exhausted) throw new Error(message);
    return { synced: false, exhausted: true };
  }
}
