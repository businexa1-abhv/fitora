import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { AuthUserPayload } from '../decorators/current-user.decorator';
import { AUDIT_EXCLUDED_PATHS } from '../constants/security.constants';
import { AuditLogService } from '../audit/audit-log.service';
import { RequestWithId } from '../middleware/request-id.middleware';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      RequestWithId & { user?: AuthUserPayload }
    >();
    const { method, originalUrl, user, ip, headers } = request;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const path = originalUrl.split('?')[0];
    if (AUDIT_EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded))) {
      return next.handle();
    }

    const entityType = this.extractEntityType(path);

    return next.handle().pipe(
      tap(() => {
        void this.auditLogService
          .log({
            actorId: user?.id ?? null,
            action: AuditAction.UPDATE,
            entityType,
            after: {
              method,
              path,
              requestId: request.requestId,
            },
            ipAddress: ip ?? request.socket.remoteAddress,
            userAgent: headers['user-agent'] as string | undefined,
          })
          .catch(() => {
            /* audit failures must not break requests */
          });
      }),
    );
  }

  private extractEntityType(path: string): string {
    const segments = path.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);
    return segments[0] ?? 'api';
  }
}
