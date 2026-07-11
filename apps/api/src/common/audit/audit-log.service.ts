import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';

export interface AuditEventInput {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(event: AuditEventInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        before: event.before as Prisma.InputJsonValue | undefined,
        after: event.after as Prisma.InputJsonValue | undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    });
  }

  async logAuthEvent(
    action: AuditAction,
    actorId: string | null,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.log({
      actorId,
      action,
      entityType: 'auth',
      after: metadata ? { ...metadata } : undefined,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }
}
