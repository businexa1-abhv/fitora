import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { QueueJobsService } from '../queue/queue-jobs.service';
import { QueueManagerService } from '../queue/queue-manager.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      | 'notification'
      | 'notificationPreference'
      | 'notificationDelivery'
      | 'user'
      | 'deviceToken'
      | 'userRoleAssignment'
      | 'booking'
    >
  >;

  const queueJobs = {
    enqueueEmail: jest.fn(),
    enqueueSms: jest.fn(),
    enqueuePush: jest.fn(),
  };

  const queueManager = {
    getMonitoringDashboard: jest.fn(),
    triggerScheduledJob: jest.fn(),
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      notificationDelivery: {
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      deviceToken: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
      userRoleAssignment: { findMany: jest.fn() },
      booking: { findMany: jest.fn() },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueJobsService, useValue: queueJobs },
        { provide: QueueManagerService, useValue: queueManager },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('creates in-app notification and enqueues channel jobs', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      typeOverrides: null,
    } as never);
    prisma.notification.create.mockResolvedValue({
      id: 'n1',
      type: NotificationType.PAYMENT_SUCCESS,
      channel: 'IN_APP',
      title: 'Test',
      body: 'Body',
      data: null,
      readAt: null,
      createdAt: new Date(),
    } as never);
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'd1' } as never);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 2 } as never);
    prisma.notificationDelivery.findMany.mockResolvedValue([
      { id: 'd1', channel: 'EMAIL' },
      { id: 'd2', channel: 'SMS' },
    ] as never);
    prisma.notificationDelivery.findFirst.mockResolvedValue({ id: 'd1' } as never);
    prisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', phone: '+911' } as never);

    const result = await service.notifyPaymentSuccess('user-1', 500, 'BOOKING');
    expect(result?.id).toBe('n1');
    expect(prisma.notification.create).toHaveBeenCalled();
  });
});
