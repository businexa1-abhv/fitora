import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';
import { AuditLogService } from '../../common/audit/audit-log.service';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'logAuthEvent'>>;

  beforeEach(async () => {
    auditLogService = { logAuthEvent: jest.fn() };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  it('logs auth events', async () => {
    await service.logAuthEvent(AuditAction.LOGIN, 'user-1', {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(auditLogService.logAuthEvent).toHaveBeenCalledWith(
      AuditAction.LOGIN,
      'user-1',
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );
  });
});
