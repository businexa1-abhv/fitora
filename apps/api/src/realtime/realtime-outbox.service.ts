import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, RealtimeOutboxStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import type { RealtimeEventEnvelope, RealtimeEventType } from './realtime.types';
import { wrapRealtimeEvent } from './realtime.types';

type OutboxListener = (envelope: RealtimeEventEnvelope) => void | Promise<void>;

/**
 * Transactional outbox for realtime events.
 * Writers enqueue inside the same DB transaction as the mutation.
 * A lightweight dispatcher publishes after commit with retry.
 */
@Injectable()
export class RealtimeOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeOutboxService.name);
  private readonly listeners = new Set<OutboxListener>();
  private timer: NodeJS.Timeout | null = null;
  private pumping = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.pump();
    }, 1500);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  onPublished(listener: OutboxListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Enqueue inside an existing Prisma transaction. */
  async enqueueInTx(
    tx: Prisma.TransactionClient,
    event: RealtimeEventType,
    data: unknown,
    meta?: Partial<Omit<RealtimeEventEnvelope, 'eventId' | 'event' | 'occurredAt' | 'data'>>,
  ) {
    const envelope = wrapRealtimeEvent(event, data, meta);
    await tx.realtimeOutbox.create({
      data: {
        eventId: envelope.eventId,
        eventType: envelope.event,
        payload: envelope as unknown as Prisma.InputJsonValue,
        status: RealtimeOutboxStatus.PENDING,
        availableAt: new Date(),
      },
    });
    return envelope;
  }

  /** Enqueue outside a transaction and return the envelope (caller publishes). */
  async enqueue(
    event: RealtimeEventType,
    data: unknown,
    meta?: Partial<Omit<RealtimeEventEnvelope, 'eventId' | 'event' | 'occurredAt' | 'data'>>,
  ) {
    const envelope = wrapRealtimeEvent(event, data, meta);
    await this.prisma.realtimeOutbox.create({
      data: {
        eventId: envelope.eventId,
        eventType: envelope.event,
        payload: envelope as unknown as Prisma.InputJsonValue,
        status: RealtimeOutboxStatus.PENDING,
        availableAt: new Date(),
      },
    });
    return envelope;
  }

  /** Mark as published after a successful local / socket fan-out. */
  async markPublished(eventId: string) {
    await this.prisma.realtimeOutbox.updateMany({
      where: { eventId, status: { not: RealtimeOutboxStatus.PUBLISHED } },
      data: {
        status: RealtimeOutboxStatus.PUBLISHED,
        publishedAt: new Date(),
        lastError: null,
      },
    });
  }

  async pump(limit = 50) {
    if (this.pumping) return { published: 0 };
    this.pumping = true;
    let published = 0;
    try {
      const now = new Date();
      const rows = await this.prisma.realtimeOutbox.findMany({
        where: {
          status: { in: [RealtimeOutboxStatus.PENDING, RealtimeOutboxStatus.FAILED] },
          availableAt: { lte: now },
          attempts: { lt: 8 },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      for (const row of rows) {
        const claimed = await this.prisma.realtimeOutbox.updateMany({
          where: {
            id: row.id,
            status: { in: [RealtimeOutboxStatus.PENDING, RealtimeOutboxStatus.FAILED] },
          },
          data: {
            status: RealtimeOutboxStatus.PROCESSING,
            attempts: { increment: 1 },
          },
        });
        if (claimed.count === 0) continue;

        try {
          const envelope = row.payload as unknown as RealtimeEventEnvelope;
          for (const listener of this.listeners) {
            await listener(envelope);
          }
          await this.prisma.realtimeOutbox.update({
            where: { id: row.id },
            data: {
              status: RealtimeOutboxStatus.PUBLISHED,
              publishedAt: new Date(),
              lastError: null,
            },
          });
          published += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Outbox publish failed for ${row.eventId}: ${message}`);
          const backoffMs = Math.min(60_000, 1000 * 2 ** Math.min(row.attempts + 1, 6));
          await this.prisma.realtimeOutbox.update({
            where: { id: row.id },
            data: {
              status: RealtimeOutboxStatus.FAILED,
              lastError: message.slice(0, 1000),
              availableAt: new Date(Date.now() + backoffMs),
            },
          });
        }
      }
    } finally {
      this.pumping = false;
    }
    return { published };
  }
}
