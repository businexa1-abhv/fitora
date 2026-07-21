import { randomBytes } from 'crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  IntegrationConflictStatus,
  IntegrationDirection,
  IntegrationSyncJobStatus,
  type Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import type { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { IntegrationCryptoService } from './integration-crypto.service';
import type {
  CreateIntegrationDto,
  CreateSlotMappingDto,
  UpdateIntegrationDto,
} from './dto/integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: IntegrationCryptoService,
  ) {}

  async list(user: AuthUserPayload, tenantId?: string) {
    const ownerId = user.roles.includes(UserRole.ADMIN) ? undefined : user.id;
    return this.prisma.integrationConnection.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(ownerId ? { tenantId: { in: await this.ownerTenantIds(ownerId) } } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        name: true,
        status: true,
        outboundEndpoint: true,
        config: true,
        lastSyncAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        failedWebhookCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(id: string, user: AuthUserPayload) {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        name: true,
        status: true,
        outboundEndpoint: true,
        config: true,
        lastSyncAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        failedWebhookCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!connection) throw new NotFoundException('Integration not found');
    await this.assertTenantAccess(connection.tenantId, user);
    return connection;
  }

  async create(dto: CreateIntegrationDto, user: AuthUserPayload) {
    await this.assertTenantAccess(dto.tenantId, user);
    const apiKey = `fitora_${randomBytes(32).toString('base64url')}`;
    const webhookSecret = randomBytes(32).toString('base64url');
    const connection = await this.prisma.integrationConnection.create({
      data: {
        tenantId: dto.tenantId,
        provider: dto.provider,
        name: dto.name,
        apiKeyHash: this.crypto.hashApiKey(apiKey),
        webhookSecretEncrypted: this.crypto.encrypt(webhookSecret),
        credentialsEncrypted: dto.credentials ? this.crypto.encrypt(dto.credentials) : null,
        outboundEndpoint: dto.outboundEndpoint,
        config: dto.config as Prisma.InputJsonValue | undefined,
      },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        name: true,
        status: true,
        outboundEndpoint: true,
        config: true,
        createdAt: true,
      },
    });
    return { ...connection, apiKey, webhookSecret };
  }

  async update(id: string, dto: UpdateIntegrationDto, user: AuthUserPayload) {
    await this.detail(id, user);
    return this.prisma.integrationConnection.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        outboundEndpoint: dto.outboundEndpoint,
        config: dto.config as Prisma.InputJsonValue | undefined,
        ...(dto.credentials ? { credentialsEncrypted: this.crypto.encrypt(dto.credentials) } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        name: true,
        status: true,
        outboundEndpoint: true,
        config: true,
        updatedAt: true,
      },
    });
  }

  async upsertMapping(id: string, dto: CreateSlotMappingDto, user: AuthUserPayload) {
    const connection = await this.detail(id, user);
    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: dto.slotId, court: { tenantId: connection.tenantId } },
      select: { id: true },
    });
    if (!slot) throw new NotFoundException('Slot not found for integration tenant');
    return this.prisma.slotChannelMapping.upsert({
      where: { integrationId_slotId: { integrationId: id, slotId: dto.slotId } },
      create: {
        integrationId: id,
        slotId: dto.slotId,
        externalSlotId: dto.externalSlotId,
        isActive: dto.isActive ?? true,
      },
      update: {
        externalSlotId: dto.externalSlotId,
        isActive: dto.isActive,
      },
    });
  }

  async health(id: string, user: AuthUserPayload) {
    const connection = await this.detail(id, user);
    const counts = await this.prisma.integrationSyncJob.groupBy({
      by: ['status'],
      where: { integrationId: id },
      _count: true,
    });
    return { connection, queue: Object.fromEntries(counts.map((row) => [row.status, row._count])) };
  }

  async failedSyncs(id: string, user: AuthUserPayload) {
    await this.detail(id, user);
    return this.prisma.integrationSyncJob.findMany({
      where: {
        integrationId: id,
        status: { in: [IntegrationSyncJobStatus.FAILED, IntegrationSyncJobStatus.DEAD_LETTER] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async retry(jobId: string, user: AuthUserPayload) {
    const job = await this.prisma.integrationSyncJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Sync job not found');
    await this.detail(job.integrationId, user);
    return this.prisma.integrationSyncJob.update({
      where: { id: jobId },
      data: {
        status: IntegrationSyncJobStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: null,
      },
    });
  }

  async conflicts(id: string, user: AuthUserPayload) {
    await this.detail(id, user);
    return this.prisma.integrationConflict.findMany({
      where: { integrationId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveConflict(id: string, conflictId: string, note: string, user: AuthUserPayload) {
    await this.detail(id, user);
    return this.prisma.integrationConflict.update({
      where: { id: conflictId },
      data: {
        status: IntegrationConflictStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionNote: note,
      },
    });
  }

  async manualResync(id: string, user: AuthUserPayload) {
    await this.detail(id, user);
    const mappings = await this.prisma.slotChannelMapping.findMany({
      where: { integrationId: id, isActive: true },
      select: { slotId: true },
    });
    const now = Date.now();
    await this.prisma.integrationSyncJob.createMany({
      data: mappings.map((mapping) => ({
        integrationId: id,
        slotId: mapping.slotId,
        direction: IntegrationDirection.OUTBOUND,
        eventType: 'availability.resync',
        payload: { slotId: mapping.slotId },
        idempotencyKey: `resync:${id}:${mapping.slotId}:${now}`,
      })),
      skipDuplicates: true,
    });
    return { queued: mappings.length };
  }

  async stats(user: AuthUserPayload, tenantId?: string) {
    const connections = await this.list(user, tenantId);
    const ids = connections.map((item) => item.id);
    if (!ids.length) {
      return {
        connectedProviders: 0,
        syncHealth: 100,
        lastSync: null,
        failedSyncs: 0,
        retryQueue: 0,
        averageLatencyMs: 0,
        p95LatencyMs: 0,
        duplicateBookingConflicts: 0,
        failedWebhookCount: 0,
      };
    }
    const [jobs, duplicateBookingConflicts] = await Promise.all([
      this.prisma.integrationSyncJob.findMany({
        where: { integrationId: { in: ids } },
        select: { status: true, latencyMs: true },
        take: 10_000,
      }),
      this.prisma.integrationConflict.count({
        where: { integrationId: { in: ids }, type: 'DUPLICATE_BOOKING' },
      }),
    ]);
    const latencies = jobs
      .map((job) => job.latencyMs)
      .filter((value): value is number => value != null)
      .sort((a, b) => a - b);
    const succeeded = jobs.filter(
      (job) => job.status === IntegrationSyncJobStatus.SUCCEEDED,
    ).length;
    const failed = jobs.filter(
      (job) =>
        job.status === IntegrationSyncJobStatus.FAILED ||
        job.status === IntegrationSyncJobStatus.DEAD_LETTER,
    ).length;
    return {
      connectedProviders: connections.length,
      syncHealth: jobs.length ? Math.round((succeeded / jobs.length) * 100) : 100,
      lastSync: connections.reduce<Date | null>(
        (latest, item) =>
          !latest || (item.lastSyncAt && item.lastSyncAt > latest) ? item.lastSyncAt : latest,
        null,
      ),
      failedSyncs: failed,
      retryQueue: jobs.filter(
        (job) =>
          job.status === IntegrationSyncJobStatus.PENDING ||
          job.status === IntegrationSyncJobStatus.RETRYING,
      ).length,
      averageLatencyMs: latencies.length
        ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        : 0,
      p95LatencyMs: latencies.length ? latencies[Math.ceil(latencies.length * 0.95) - 1] : 0,
      duplicateBookingConflicts,
      failedWebhookCount: connections.reduce((sum, item) => sum + item.failedWebhookCount, 0),
    };
  }

  private async ownerTenantIds(ownerId: string) {
    return (
      await this.prisma.tenant.findMany({
        where: { ownerId, deletedAt: null },
        select: { id: true },
      })
    ).map((tenant) => tenant.id);
  }

  private async assertTenantAccess(tenantId: string, user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN)) return;
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, ownerId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new ForbiddenException('Integration does not belong to your tenant');
  }
}
