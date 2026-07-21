import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { QueueJobsService } from '../queue/queue-jobs.service';
import { QueueManagerService } from '../queue/queue-manager.service';

describe('NotificationsService (extended)', () => {
  let service: NotificationsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
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
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      notificationDelivery: {
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      scheduledNotification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      deviceToken: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
      userRoleAssignment: { findMany: jest.fn() },
      booking: { findMany: jest.fn() },
      membershipPurchase: { findMany: jest.fn(), updateMany: jest.fn() },
      trainingEnrollment: { findMany: jest.fn() },
    } as unknown as typeof prisma;

    prisma.notificationPreference.findUnique.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      inAppEnabled: true,
      typeOverrides: null,
    } as never);
    prisma.notificationDelivery.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);

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

  function mockNotification(overrides: Record<string, unknown> = {}) {
    return {
      id: 'n1',
      userId: 'u1',
      type: NotificationType.BOOKING_CONFIRMED,
      channel: 'IN_APP',
      title: 'Test',
      body: 'Body',
      data: null,
      readAt: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  it('listForUser returns paginated notifications', async () => {
    prisma.notification.findMany.mockResolvedValue([mockNotification()] as never);
    prisma.notification.count.mockResolvedValue(1);

    const result = await service.listForUser('u1', 1, 20);
    expect(result.items).toHaveLength(1);
    expect((result as any).total).toBe(1);
  });

  it('unreadCount returns count', async () => {
    prisma.notification.count.mockResolvedValue(5);
    const result = await service.unreadCount('u1');
    expect(result.count).toBe(5);
  });

  it('markRead updates notification', async () => {
    prisma.notification.findFirst.mockResolvedValue(mockNotification() as never);
    prisma.notification.update.mockResolvedValue(mockNotification({ readAt: new Date() }) as never);

    const result = await service.markRead('u1', 'n1');
    expect(result!.readAt).toBeTruthy();
  });

  it('markAllRead updates all unread', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 } as never);
    const result = await service.markAllRead('u1');
    expect(result.success).toBe(true);
  });

  it('getPreferences returns existing prefs', async () => {
    const prefs = await service.getPreferences('u1');
    expect(prefs.emailEnabled).toBe(true);
  });

  it('updatePreferences updates channels', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'u1',
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      typeOverrides: null,
    } as never);
    prisma.notificationPreference.update.mockResolvedValue({
      emailEnabled: false,
      smsEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      typeOverrides: null,
    } as never);

    const result = await service.updatePreferences('u1', { emailEnabled: false });
    expect(result.emailEnabled).toBe(false);
  });

  it('registerDeviceToken upserts token', async () => {
    prisma.deviceToken.upsert.mockResolvedValue({ id: 'dt-1' } as never);
    await service.registerDeviceToken('u1', 'expo-token', 'ios');
    expect(prisma.deviceToken.upsert).toHaveBeenCalled();
  });

  it('adminBroadcast sends to role users', async () => {
    prisma.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u2' },
    ] as never);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'u1@f.com', phone: null },
      { id: 'u2', email: 'u2@f.com', phone: null },
    ] as never);
    prisma.notificationPreference.findMany.mockResolvedValue([
      {
        userId: 'u1',
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        typeOverrides: null,
      },
      {
        userId: 'u2',
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        typeOverrides: null,
      },
    ] as never);
    prisma.notification.create.mockResolvedValue(mockNotification() as never);
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'd1' } as never);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 0 } as never);
    prisma.notificationDelivery.findMany.mockResolvedValue([] as never);
    prisma.user.findUnique.mockResolvedValue({ email: 'u@f.com', phone: null } as never);

    const result = await service.adminBroadcast({
      title: 'Hello',
      body: 'World',
      roles: ['PLAYER'],
      channels: ['IN_APP'],
    });

    expect(result.sent).toBe(2);
  });

  it('scheduleBroadcast creates scheduled record', async () => {
    prisma.scheduledNotification.create.mockResolvedValue({
      id: 'sn-1',
      title: 'Future',
      body: 'Msg',
      scheduledAt: new Date(),
      status: 'PENDING',
      createdAt: new Date(),
    } as never);

    const result = await service.scheduleBroadcast(
      {
        title: 'Future',
        body: 'Msg',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        channels: ['IN_APP'],
      },
      'admin-1',
    );

    expect(result.id).toBe('sn-1');
  });

  it('notifyBookingConfirmed creates notification', async () => {
    prisma.notification.create.mockResolvedValue(
      mockNotification({ title: 'Booking confirmed' }) as never,
    );
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'd1' } as never);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 0 } as never);
    prisma.user.findUnique.mockResolvedValue({ email: 'u@f.com', phone: null } as never);

    const result = await service.notifyBookingConfirmed('u1', {
      id: 'b1',
      courtName: 'Arena',
      slotStart: new Date(),
      checkInCode: 'ABC',
    });

    expect(result?.title).toBe('Booking confirmed');
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('getDeliveryHistory returns deliveries for owner', async () => {
    prisma.notification.findFirst.mockResolvedValue(mockNotification() as never);
    prisma.notificationDelivery.findMany.mockResolvedValue([
      {
        channel: 'EMAIL',
        status: 'SENT',
        sentAt: new Date(),
        errorMessage: null,
        createdAt: new Date(),
      },
    ] as never);

    const deliveries = await service.getDeliveryHistory('n1', 'u1');
    expect(deliveries).toHaveLength(1);
  });

  it('getDeliveryHistory throws for wrong user', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.getDeliveryHistory('n1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sendBookingReminders processes upcoming bookings', async () => {
    const slotStart = new Date(Date.now() + 23 * 60 * 60 * 1000);
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'b1',
        userId: 'u1',
        checkInCode: 'ABC',
        court: { name: 'Arena' },
        slot: { startTime: slotStart },
        user: { id: 'u1' },
      },
    ] as never);
    prisma.notification.create.mockResolvedValue(mockNotification() as never);
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'd1' } as never);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 0 } as never);
    prisma.user.findUnique.mockResolvedValue({ email: 'u@f.com', phone: null } as never);

    const result = await service.sendBookingReminders();
    expect(result.sent).toBeGreaterThanOrEqual(0);
  });

  it('notifyPaymentFailed creates notification', async () => {
    prisma.notification.create.mockResolvedValue(
      mockNotification({ title: 'Payment failed' }) as never,
    );
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'd1' } as never);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 0 } as never);
    prisma.user.findUnique.mockResolvedValue({ email: 'u@f.com', phone: null } as never);

    const result = await service.notifyPaymentFailed('u1', 500, 'BOOKING', 'Declined');
    expect(result?.title).toBe('Payment failed');
  });

  it('notifyMembershipExpiring creates warning', async () => {
    prisma.notification.create.mockResolvedValue(
      mockNotification({ title: 'Membership expiring' }) as never,
    );
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'd1' } as never);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 0 } as never);
    prisma.user.findUnique.mockResolvedValue({ email: 'u@f.com', phone: null } as never);

    const result = await service.notifyMembershipExpiring('u1', 'Gold Plan');
    expect(result?.title).toBe('Membership expiring');
  });

  it('processScheduledBroadcasts processes due items', async () => {
    prisma.scheduledNotification.findMany.mockResolvedValue([
      {
        id: 'sn-1',
        title: 'Due',
        body: 'Msg',
        channels: ['IN_APP'],
        roles: ['PLAYER'],
        userIds: [],
        scheduledAt: new Date(Date.now() - 1000),
        status: 'PENDING',
        createdAt: new Date(),
      },
    ] as never);
    prisma.userRoleAssignment.findMany.mockResolvedValue([{ userId: 'u1' }] as never);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'u@f.com', phone: null }] as never);
    prisma.notificationPreference.findMany.mockResolvedValue([
      {
        userId: 'u1',
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        typeOverrides: null,
      },
    ] as never);
    prisma.notification.create.mockResolvedValue(mockNotification() as never);
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'd1' } as never);
    prisma.notificationDelivery.createMany.mockResolvedValue({ count: 0 } as never);
    prisma.user.findUnique.mockResolvedValue({ email: 'u@f.com', phone: null } as never);
    prisma.scheduledNotification.update.mockResolvedValue({} as never);

    const result = await service.processScheduledBroadcasts();
    expect(result.processed).toBe(1);
  });
});
