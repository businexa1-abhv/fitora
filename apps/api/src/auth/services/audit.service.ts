import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditLogService } from '../../common/audit/audit-log.service';

/** @deprecated Use AuditLogService directly for new code. */
@Injectable()
export class AuditService {
  constructor(private auditLogService: AuditLogService) {}

  async logAuthEvent(
    action: AuditAction,
    actorId: string | null,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.auditLogService.logAuthEvent(action, actorId, metadata);
  }
}
