import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { NotificationsController } from '../../src/notifications/notifications.controller';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { QueueManagerService } from '../../src/queue/queue-manager.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

describe('Notifications API (integration)', () => {
  let app: INestApplication;
  const notificationsService = {
    listForUser: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    unreadCount: jest.fn(),
    registerDeviceToken: jest.fn(),
    removeDeviceToken: jest.fn(),
    adminBroadcast: jest.fn(),
    scheduleBroadcast: jest.fn(),
    listScheduledNotifications: jest.fn(),
    cancelScheduledNotification: jest.fn(),
    getQueueStats: jest.fn(),
    sendBookingReminders: jest.fn(),
    getDeliveryHistory: jest.fn(),
  };
  const queueManager = {
    triggerScheduledJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
        { provide: QueueManagerService, useValue: queueManager },
      ],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('GET /api/v1/notifications returns history', async () => {
    notificationsService.listForUser.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  it('GET /api/v1/notifications/unread-count returns badge count', async () => {
    notificationsService.unreadCount.mockResolvedValue({ count: 3 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.count).toBe(3);
  });

  it('GET /api/v1/notifications/preferences returns prefs', async () => {
    notificationsService.getPreferences.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/preferences')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.emailEnabled).toBe(true);
  });

  it('PATCH /api/v1/notifications/preferences updates prefs', async () => {
    notificationsService.updatePreferences.mockResolvedValue({ emailEnabled: false });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/notifications/preferences')
      .set('x-test-role', 'player')
      .send({ emailEnabled: false })
      .expect(200);

    expect(res.body.emailEnabled).toBe(false);
  });

  it('POST /api/v1/notifications/admin/broadcast sends broadcast', async () => {
    notificationsService.adminBroadcast.mockResolvedValue({ sent: 10, userIds: 10 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/notifications/admin/broadcast')
      .set('x-test-role', 'admin')
      .send({ title: 'Hello', body: 'World' })
      .expect(201);

    expect(res.body.sent).toBe(10);
  });

  it('GET /api/v1/notifications/admin/queue-status returns dashboard', async () => {
    notificationsService.getQueueStats.mockResolvedValue({ mode: 'inline', queues: [] });

    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/admin/queue-status')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(res.body.mode).toBe('inline');
  });

  it('POST /api/v1/notifications/admin/jobs/:name triggers job', async () => {
    queueManager.triggerScheduledJob.mockResolvedValue({ ok: true });

    await request(app.getHttpServer())
      .post('/api/v1/notifications/admin/jobs/booking-reminder')
      .set('x-test-role', 'admin')
      .expect(201);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
  });
});
