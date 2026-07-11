import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import {
  BookingStatus,
  EnrollmentStatus,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  PaymentEntityType,
  Prisma,
  ScheduledNotificationStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { QueueJobsService } from '../queue/queue-jobs.service';
import { QueueManagerService } from '../queue/queue-manager.service';
import {
  buildCursorPaginatedResult,
  decodeCursor,
} from '../common/utils/cursor-pagination.util';
import {
  BroadcastNotificationDto,
  ScheduleNotificationDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';

type DispatchOptions = {
  channels?: NotificationChannel[];
  skipPush?: boolean;
  skipInApp?: boolean;
};

type TypeOverride = {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => QueueJobsService))
    private queueJobs: QueueJobsService,
    private queueManager: QueueManagerService,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    options?: DispatchOptions,
  ) {
    const prefs = await this.getOrCreatePreferences(userId);
    const externalChannels = (options?.channels ?? [
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
      NotificationChannel.PUSH,
    ]).filter((c) => c !== NotificationChannel.IN_APP);

    let notification = null as Awaited<ReturnType<typeof this.prisma.notification.create>> | null;

    if (!options?.skipInApp && prefs.inAppEnabled && this.isChannelAllowed(type, prefs, 'inApp')) {
      notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          channel: NotificationChannel.IN_APP,
          title,
          body,
          data: data ? (data as Prisma.InputJsonValue) : undefined,
          sentAt: new Date(),
        },
      });

      await this.prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: NotificationChannel.IN_APP,
          status: NotificationDeliveryStatus.SENT,
          sentAt: new Date(),
        },
      });
    }

    const channelsToDispatch = externalChannels.filter((channel) =>
      this.isExternalChannelAllowed(type, channel, prefs),
    );

    if (channelsToDispatch.length === 0) {
      return notification;
    }

    if (!notification) {
      notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          channel: NotificationChannel.IN_APP,
          title,
          body,
          data: data ? (data as Prisma.InputJsonValue) : undefined,
          sentAt: new Date(),
        },
      });
    }

    await this.prisma.notificationDelivery.createMany({
      data: channelsToDispatch.map((channel) => ({
        notificationId: notification!.id,
        channel,
        status: NotificationDeliveryStatus.PENDING,
      })),
    });

    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: { notificationId: notification!.id, channel: { in: channelsToDispatch } },
    });
    const deliveryByChannel = new Map(deliveries.map((d) => [d.channel, d]));

    await this.enqueueChannelJobs(
      userId,
      notification!.id,
      title,
      body,
      type,
      data,
      channelsToDispatch,
      deliveryByChannel,
    );

    return notification;
  }

  private async enqueueChannelJobs(
    userId: string,
    notificationId: string,
    title: string,
    body: string,
    type: NotificationType,
    data: Record<string, unknown> | undefined,
    channels: NotificationChannel[],
    deliveryByChannel?: Map<NotificationChannel, { id: string }>,
    prefetchedUser?: { email: string | null; phone: string | null } | null,
  ) {
    const user =
      prefetchedUser ??
      (await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true },
      }));
    if (!user) return;

    const pushData: Record<string, string> = {
      type,
      path: this.resolveDeepLinkPath(type, data),
      ...(data
        ? Object.fromEntries(
            Object.entries(data).map(([k, v]) => [
              k,
              typeof v === 'string' ? v : JSON.stringify(v),
            ]),
          )
        : {}),
    };

    for (const channel of channels) {
      const delivery = deliveryByChannel?.get(channel) ?? (await this.prisma.notificationDelivery.findFirst({
        where: { notificationId, channel },
      }));
      if (!delivery) continue;

      if (channel === NotificationChannel.EMAIL && user.email) {
        await this.queueJobs.enqueueEmail({
          to: user.email,
          subject: `[Fitora] ${title}`,
          body,
          notificationId,
          deliveryId: delivery.id,
        });
      } else if (channel === NotificationChannel.SMS && user.phone) {
        await this.queueJobs.enqueueSms({
          phone: user.phone,
          message: `${title}: ${body}`,
          notificationId,
          deliveryId: delivery.id,
        });
      } else if (channel === NotificationChannel.PUSH) {
        await this.queueJobs.enqueuePush({
          userId,
          title,
          body,
          data: pushData,
          notificationId,
          deliveryId: delivery.id,
        });
      } else {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.SKIPPED,
            errorMessage: 'Missing contact or unsupported channel',
          },
        });
      }
    }
  }

  async markDeliverySent(deliveryId: string, ok: boolean) {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: ok ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.FAILED,
        sentAt: ok ? new Date() : null,
        errorMessage: ok ? null : 'Provider returned failure',
      },
    });
  }

  private resolveDeepLinkPath(type: NotificationType, data?: Record<string, unknown>): string {
    switch (type) {
      case NotificationType.BOOKING_CONFIRMED:
      case NotificationType.BOOKING_REMINDER:
      case NotificationType.BOOKING_CANCELLED:
        return 'bookings';
      case NotificationType.MEMBERSHIP_ACTIVATED:
      case NotificationType.MEMBERSHIP_EXPIRING:
        return 'membership';
      case NotificationType.TRAINING_ENROLLED:
      case NotificationType.TRAINING_REMINDER:
      case NotificationType.TRAINING_PROGRESS:
        return 'training';
      case NotificationType.ORDER_CONFIRMED:
      case NotificationType.ORDER_SHIPPED:
        return 'store';
      case NotificationType.SERVICE_ORDER_UPDATE:
        return 'services';
      case NotificationType.PRINT_ORDER_UPDATE:
        return 'services';
      case NotificationType.PAYMENT_SUCCESS:
      case NotificationType.PAYMENT_FAILED:
      case NotificationType.WALLET_CREDIT:
        return 'wallet';
      default:
        return data?.path && typeof data.path === 'string' ? data.path : 'notifications';
    }
  }

  async getOrCreatePreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  async getPreferences(userId: string) {
    const prefs = await this.getOrCreatePreferences(userId);
    return this.formatPreferences(prefs);
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    await this.getOrCreatePreferences(userId);
    const updated = await this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        emailEnabled: dto.emailEnabled,
        smsEnabled: dto.smsEnabled,
        pushEnabled: dto.pushEnabled,
        inAppEnabled: dto.inAppEnabled,
        typeOverrides: dto.typeOverrides
          ? (dto.typeOverrides as Prisma.InputJsonValue)
          : undefined,
      },
    });
    return this.formatPreferences(updated);
  }

  private formatPreferences(prefs: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    typeOverrides: Prisma.JsonValue;
  }) {
    return {
      emailEnabled: prefs.emailEnabled,
      smsEnabled: prefs.smsEnabled,
      pushEnabled: prefs.pushEnabled,
      inAppEnabled: prefs.inAppEnabled,
      typeOverrides: (prefs.typeOverrides as Record<string, TypeOverride> | null) ?? {},
    };
  }

  private getTypeOverride(
    type: NotificationType,
    prefs: { typeOverrides: Prisma.JsonValue },
  ): TypeOverride | null {
    const overrides = prefs.typeOverrides as Record<string, TypeOverride> | null;
    return overrides?.[type] ?? null;
  }

  private isChannelAllowed(
    type: NotificationType,
    prefs: { typeOverrides: Prisma.JsonValue },
    channel: keyof TypeOverride,
  ) {
    const override = this.getTypeOverride(type, prefs);
    if (override && override[channel] !== undefined) return override[channel]!;
    return true;
  }

  private isExternalChannelAllowed(
    type: NotificationType,
    channel: NotificationChannel,
    prefs: {
      emailEnabled: boolean;
      smsEnabled: boolean;
      pushEnabled: boolean;
      inAppEnabled: boolean;
      typeOverrides: Prisma.JsonValue;
    },
  ) {
    const map: Record<NotificationChannel, boolean> = {
      [NotificationChannel.IN_APP]: prefs.inAppEnabled,
      [NotificationChannel.EMAIL]: prefs.emailEnabled,
      [NotificationChannel.SMS]: prefs.smsEnabled,
      [NotificationChannel.PUSH]: prefs.pushEnabled,
    };
    if (!map[channel]) return false;

    const key =
      channel === NotificationChannel.EMAIL
        ? 'email'
        : channel === NotificationChannel.SMS
          ? 'sms'
          : channel === NotificationChannel.PUSH
            ? 'push'
            : 'inApp';
    return this.isChannelAllowed(type, prefs, key);
  }

  async registerDeviceToken(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, platform, isActive: true },
      update: { platform, isActive: true },
    });
  }

  async removeDeviceToken(userId: string, token: string) {
    await this.prisma.deviceToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
    return { success: true };
  }

  async adminBroadcast(dto: BroadcastNotificationDto) {
    let userIds = dto.userIds ?? [];

    if (dto.roles?.length) {
      const roleUsers = await this.prisma.userRoleAssignment.findMany({
        where: { role: { in: dto.roles as UserRole[] }, deletedAt: null },
        select: { userId: true },
      });
      userIds = [...new Set([...userIds, ...roleUsers.map((r) => r.userId)])];
    }

    if (userIds.length === 0) {
      const allUsers = await this.prisma.user.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true },
        take: 500,
      });
      userIds = allUsers.map((u) => u.id);
    }

    const channels = dto.channels ?? [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ];
    const externalChannels = channels.filter((c) => c !== NotificationChannel.IN_APP);

    const [users, preferences] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds }, deletedAt: null },
        select: { id: true, email: true, phone: true },
      }),
      this.prisma.notificationPreference.findMany({
        where: { userId: { in: userIds } },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const prefMap = new Map(preferences.map((p) => [p.userId, p]));

    const missingPrefUserIds = userIds.filter((id) => !prefMap.has(id));
    if (missingPrefUserIds.length > 0) {
      await this.prisma.notificationPreference.createMany({
        data: missingPrefUserIds.map((userId) => ({ userId })),
        skipDuplicates: true,
      });
      const createdPrefs = await this.prisma.notificationPreference.findMany({
        where: { userId: { in: missingPrefUserIds } },
      });
      for (const pref of createdPrefs) prefMap.set(pref.userId, pref);
    }

    let sent = 0;
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (userId) => {
          const prefs = prefMap.get(userId);
          const user = userMap.get(userId);
          if (!prefs || !user) return;

          await this.create(
            userId,
            NotificationType.ADMIN_BROADCAST,
            dto.title,
            dto.body,
            { broadcast: true },
            { channels: externalChannels },
          );
          sent++;
        }),
      );
    }

    return { sent, userIds: userIds.length };
  }

  async scheduleBroadcast(dto: ScheduleNotificationDto, createdById: string) {
    const scheduled = await this.prisma.scheduledNotification.create({
      data: {
        title: dto.title,
        body: dto.body,
        scheduledAt: new Date(dto.scheduledAt),
        roles: dto.roles ?? [],
        userIds: dto.userIds ?? [],
        channels: dto.channels ?? [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
          NotificationChannel.PUSH,
        ],
        createdById,
      },
    });
    return this.formatScheduledNotification(scheduled);
  }

  async listScheduledNotifications(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.scheduledNotification.findMany({
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.scheduledNotification.count(),
    ]);
    return {
      items: items.map((s) => this.formatScheduledNotification(s)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async cancelScheduledNotification(id: string) {
    const item = await this.prisma.scheduledNotification.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Scheduled notification not found');
    if (item.status !== ScheduledNotificationStatus.PENDING) {
      return this.formatScheduledNotification(item);
    }
    const updated = await this.prisma.scheduledNotification.update({
      where: { id },
      data: { status: ScheduledNotificationStatus.CANCELLED },
    });
    return this.formatScheduledNotification(updated);
  }

  async processScheduledBroadcasts() {
    const due = await this.prisma.scheduledNotification.findMany({
      where: {
        status: ScheduledNotificationStatus.PENDING,
        scheduledAt: { lte: new Date() },
      },
      take: 20,
    });

    let processed = 0;
    for (const item of due) {
      await this.prisma.scheduledNotification.update({
        where: { id: item.id },
        data: { status: ScheduledNotificationStatus.PROCESSING },
      });

      try {
        const result = await this.adminBroadcast({
          title: item.title,
          body: item.body,
          roles: item.roles.length ? item.roles : undefined,
          userIds: item.userIds.length ? item.userIds : undefined,
          channels: item.channels,
        });

        await this.prisma.scheduledNotification.update({
          where: { id: item.id },
          data: {
            status: ScheduledNotificationStatus.COMPLETED,
            processedAt: new Date(),
            resultMeta: result as Prisma.InputJsonValue,
          },
        });
        processed++;
      } catch (err) {
        await this.prisma.scheduledNotification.update({
          where: { id: item.id },
          data: {
            status: ScheduledNotificationStatus.FAILED,
            processedAt: new Date(),
            resultMeta: {
              error: err instanceof Error ? err.message : 'Processing failed',
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    return { processed, checked: due.length };
  }

  async sendBookingReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        deletedAt: null,
        slot: { startTime: { gte: windowStart, lte: windowEnd } },
      },
      include: {
        court: { select: { name: true } },
        slot: { select: { startTime: true, endTime: true } },
        user: { select: { id: true } },
      },
    });

    let sent = 0;
    const bookingIds = bookings.map((b) => b.id);
    const existingReminders = bookingIds.length
      ? await this.prisma.notification.findMany({
          where: {
            type: NotificationType.BOOKING_REMINDER,
            deletedAt: null,
            OR: bookings.map((b) => ({
              userId: b.userId,
              data: { path: ['bookingId'], equals: b.id },
            })),
          },
          select: { data: true },
        })
      : [];

    const remindedBookingIds = new Set(
      existingReminders
        .map((n) => (n.data as Record<string, unknown> | null)?.bookingId)
        .filter((id): id is string => typeof id === 'string'),
    );

    for (const booking of bookings) {
      if (remindedBookingIds.has(booking.id)) continue;

      await this.notifyBookingReminder(booking.userId, {
        bookingId: booking.id,
        courtName: booking.court.name,
        slotStart: booking.slot.startTime,
        checkInCode: booking.checkInCode,
      });
      sent++;
    }

    return { sent, checked: bookings.length };
  }

  async sendMembershipExpiringReminders() {
    const now = new Date();
    const windows = [7, 3, 1];
    let sent = 0;

    for (const days of windows) {
      const start = new Date(now);
      start.setDate(start.getDate() + days);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const purchases = await this.prisma.membershipPurchase.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          endDate: { gte: start, lte: end },
        },
        include: { plan: { select: { name: true } }, user: { select: { id: true } } },
      });

      for (const purchase of purchases) {
        if (!purchase.endDate) continue;
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId: purchase.userId,
            type: NotificationType.MEMBERSHIP_EXPIRING,
            data: { path: ['purchaseId'], equals: purchase.id },
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });
        const existingDays =
          existing?.data &&
          typeof existing.data === 'object' &&
          existing.data !== null &&
          'daysBefore' in existing.data
            ? (existing.data as { daysBefore?: number }).daysBefore
            : null;
        if (existingDays === days) continue;

        await this.notifyMembershipExpiring(purchase.userId, {
          purchaseId: purchase.id,
          planName: purchase.plan.name,
          endDate: purchase.endDate.toISOString().slice(0, 10),
          daysBefore: days,
        });
        sent++;
      }
    }

    return { sent };
  }

  async expireMembershipsWithNotification() {
    const now = new Date();
    const expiring = await this.prisma.membershipPurchase.findMany({
      where: { isActive: true, endDate: { lt: now }, deletedAt: null },
      include: { plan: { select: { name: true } } },
    });

    const result = await this.prisma.membershipPurchase.updateMany({
      where: { isActive: true, endDate: { lt: now }, deletedAt: null },
      data: { isActive: false },
    });

    for (const purchase of expiring) {
      await this.create(
        purchase.userId,
        NotificationType.MEMBERSHIP_EXPIRING,
        'Membership expired',
        `Your ${purchase.plan.name} membership has expired. Renew to continue benefits.`,
        { purchaseId: purchase.id, expired: true },
      );
    }

    return { expired: result.count, notified: expiring.length };
  }

  async sendTrainingReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayStart = new Date(tomorrow);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(tomorrow);
    dayEnd.setHours(23, 59, 59, 999);

    const enrollments = await this.prisma.trainingEnrollment.findMany({
      where: {
        status: EnrollmentStatus.ACTIVE,
        deletedAt: null,
        batch: { deletedAt: null },
      },
      include: {
        kid: { select: { firstName: true, lastName: true, parentId: true } },
        batch: {
          include: { program: { select: { name: true, court: { select: { name: true } } } } },
        },
      },
    });

    let sent = 0;
    for (const enrollment of enrollments) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: enrollment.kid.parentId,
          type: NotificationType.TRAINING_REMINDER,
          createdAt: { gte: dayStart, lte: dayEnd },
          data: { path: ['enrollmentId'], equals: enrollment.id },
        },
      });
      if (existing) continue;

      await this.create(
        enrollment.kid.parentId,
        NotificationType.TRAINING_REMINDER,
        'Training session tomorrow',
        `${enrollment.kid.firstName} has ${enrollment.batch.program.name} at ${enrollment.batch.program.court?.name ?? 'your venue'} tomorrow (${enrollment.batch.schedule}).`,
        {
          enrollmentId: enrollment.id,
          batchId: enrollment.batchId,
          programName: enrollment.batch.program.name,
        },
      );
      sent++;
    }

    return { sent, checked: enrollments.length };
  }

  async getDeliveryHistory(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, deletedAt: null },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'asc' },
    });

    return deliveries.map((d) => ({
      id: d.id,
      channel: d.channel,
      status: d.status,
      errorMessage: d.errorMessage,
      sentAt: d.sentAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async getQueueStats() {
    return this.queueManager.getMonitoringDashboard();
  }

  // ─── Domain notification helpers ───────────────────────────────────────────

  async notifyBookingConfirmed(
    userId: string,
    booking: { id: string; courtName: string; slotStart: Date; checkInCode: string | null },
  ) {
    return this.create(
      userId,
      NotificationType.BOOKING_CONFIRMED,
      'Booking confirmed',
      `Your booking at ${booking.courtName} is confirmed. Check-in code: ${booking.checkInCode ?? 'N/A'}`,
      {
        bookingId: booking.id,
        checkInCode: booking.checkInCode,
        slotStart: booking.slotStart.toISOString(),
      },
    );
  }

  async notifyBookingReminder(
    userId: string,
    booking: { bookingId: string; courtName: string; slotStart: Date; checkInCode: string | null },
  ) {
    return this.create(
      userId,
      NotificationType.BOOKING_REMINDER,
      'Booking reminder',
      `Reminder: your court booking at ${booking.courtName} is tomorrow. Check-in: ${booking.checkInCode ?? 'N/A'}`,
      {
        bookingId: booking.bookingId,
        checkInCode: booking.checkInCode,
        slotStart: booking.slotStart.toISOString(),
      },
    );
  }

  async notifyBookingCancelled(
    userId: string,
    booking: { id: string; courtName: string; refundAmount?: number },
  ) {
    const refundText =
      booking.refundAmount && booking.refundAmount > 0
        ? ` Refund of ₹${booking.refundAmount} will be processed.`
        : '';

    return this.create(
      userId,
      NotificationType.BOOKING_CANCELLED,
      'Booking cancelled',
      `Your booking at ${booking.courtName} has been cancelled.${refundText}`,
      { bookingId: booking.id, refundAmount: booking.refundAmount },
    );
  }

  async notifyMembershipActivated(
    userId: string,
    data: { purchaseId: string; planName: string; endDate: string },
  ) {
    return this.create(
      userId,
      NotificationType.MEMBERSHIP_ACTIVATED,
      'Membership activated',
      `Your ${data.planName} membership is now active until ${data.endDate}.`,
      data,
    );
  }

  async notifyMembershipExpiring(
    userId: string,
    data: { purchaseId: string; planName: string; endDate: string; daysBefore?: number },
  ) {
    return this.create(
      userId,
      NotificationType.MEMBERSHIP_EXPIRING,
      'Membership expiring soon',
      `Your ${data.planName} membership expires on ${data.endDate}. Renew to keep benefits.`,
      data,
    );
  }

  async notifyPaymentSuccess(userId: string, amount: number, entityType: string) {
    return this.create(
      userId,
      NotificationType.PAYMENT_SUCCESS,
      'Payment successful',
      `Payment of ₹${amount} for ${entityType.toLowerCase().replace(/_/g, ' ')} was successful.`,
      { amount, entityType },
    );
  }

  async notifyPaymentFailed(userId: string, amount: number, entityType: string, reason?: string) {
    return this.create(
      userId,
      NotificationType.PAYMENT_FAILED,
      'Payment failed',
      `Payment of ₹${amount} for ${entityType.toLowerCase().replace(/_/g, ' ')} failed.${reason ? ` ${reason}` : ''}`,
      { amount, entityType, reason },
    );
  }

  async notifyWalletCredit(userId: string, amount: number, balance: number) {
    return this.create(
      userId,
      NotificationType.WALLET_CREDIT,
      'Wallet credited',
      `₹${amount} added to your wallet. New balance: ₹${balance}.`,
      { amount, balance },
    );
  }

  async notifyOrderConfirmed(
    userId: string,
    data: { orderId: string; orderNumber: string; totalAmount: number },
  ) {
    return this.create(
      userId,
      NotificationType.ORDER_CONFIRMED,
      'Order confirmed',
      `Your store order ${data.orderNumber} (₹${data.totalAmount}) is confirmed.`,
      data,
    );
  }

  async notifyOrderShipped(
    userId: string,
    data: { orderId: string; orderNumber: string; trackingNumber?: string },
  ) {
    return this.create(
      userId,
      NotificationType.ORDER_SHIPPED,
      'Order shipped',
      `Order ${data.orderNumber} has shipped${data.trackingNumber ? `. Tracking: ${data.trackingNumber}` : ''}.`,
      data,
    );
  }

  async notifyTrainingEnrolled(
    parentId: string,
    data: {
      enrollmentId: string;
      kidName: string;
      programName: string;
      batchName: string;
      schedule: string;
    },
  ) {
    return this.create(
      parentId,
      NotificationType.TRAINING_ENROLLED,
      'Training enrollment confirmed',
      `${data.kidName} is enrolled in ${data.programName} (${data.batchName}). Schedule: ${data.schedule}`,
      data,
    );
  }

  async notifyProgressReport(
    parentId: string,
    data: { reportId: string; kidName: string; programName: string },
  ) {
    return this.create(
      parentId,
      NotificationType.TRAINING_PROGRESS,
      'New progress report',
      `A progress report for ${data.kidName} in ${data.programName} is now available.`,
      data,
    );
  }

  async notifyTrainerNewEnrollment(
    trainerId: string,
    data: {
      enrollmentId: string;
      kidName: string;
      programName: string;
      batchName: string;
    },
  ) {
    return this.create(
      trainerId,
      NotificationType.TRAINER_NEW_ENROLLMENT,
      'New student enrolled',
      `${data.kidName} enrolled in your batch ${data.batchName} (${data.programName}).`,
      data,
    );
  }

  async notifyLeaveRequestUpdate(
    trainerId: string,
    data: {
      leaveRequestId: string;
      status: string;
      startDate: string;
      endDate: string;
      reviewNote?: string;
    },
  ) {
    const statusLabel =
      data.status === 'APPROVED'
        ? 'approved'
        : data.status === 'REJECTED'
          ? 'rejected'
          : data.status.toLowerCase();

    return this.create(
      trainerId,
      NotificationType.LEAVE_REQUEST_UPDATE,
      `Leave request ${statusLabel}`,
      `Your leave (${data.startDate} – ${data.endDate}) was ${statusLabel}.${
        data.reviewNote ? ` Note: ${data.reviewNote}` : ''
      }`,
      data,
    );
  }

  async notifyPrintOrderUpdate(
    userId: string,
    data: {
      orderId: string;
      orderNumber: string;
      status: string;
      message: string;
    },
  ) {
    return this.create(
      userId,
      NotificationType.PRINT_ORDER_UPDATE,
      'Print order update',
      data.message,
      data,
    );
  }

  async notifyServiceOrderUpdate(
    userId: string,
    data: {
      orderId: string;
      orderNumber: string;
      status: string;
      message: string;
    },
  ) {
    return this.create(
      userId,
      NotificationType.SERVICE_ORDER_UPDATE,
      'Service order update',
      data.message,
      data,
    );
  }

  async listForUser(userId: string, page = 1, pageSize = 20, cursor?: string, limit?: number) {
    if (cursor || limit) {
      return this.listForUserCursor(userId, cursor, limit ?? pageSize);
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          deliveries: {
            select: { channel: true, status: true, sentAt: true },
          },
        },
      }),
      this.prisma.notification.count({ where: { userId, deletedAt: null } }),
    ]);

    return {
      items: items.map((n) => this.formatNotification(n)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listForUserCursor(userId: string, cursor?: string, limit = 20) {
    const where: Prisma.NotificationWhereInput = { userId, deletedAt: null };
    const decoded = cursor ? decodeCursor(cursor) : null;
    if (decoded) {
      where.OR = [
        { createdAt: { lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, id: { lt: decoded.id } },
      ];
    }

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        deliveries: {
          select: { channel: true, status: true, sentAt: true },
        },
      },
    });

    return buildCursorPaginatedResult(
      items.map((n) => ({ ...this.formatNotification(n), createdAt: n.createdAt })),
      limit,
    );
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, deletedAt: null },
    });
    if (!notification) return null;

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return this.formatNotification(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null, deletedAt: null },
    });
    return { count };
  }

  private formatScheduledNotification(item: {
    id: string;
    title: string;
    body: string;
    scheduledAt: Date;
    status: ScheduledNotificationStatus;
    roles: string[];
    userIds: string[];
    channels: NotificationChannel[];
    processedAt: Date | null;
    resultMeta: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      id: item.id,
      title: item.title,
      body: item.body,
      scheduledAt: item.scheduledAt.toISOString(),
      status: item.status,
      roles: item.roles,
      userIds: item.userIds,
      channels: item.channels,
      processedAt: item.processedAt?.toISOString() ?? null,
      resultMeta: item.resultMeta as Record<string, unknown> | null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private formatNotification(notification: {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    body: string;
    data: Prisma.JsonValue;
    readAt: Date | null;
    createdAt: Date;
    deliveries?: Array<{ channel: NotificationChannel; status: string; sentAt: Date | null }>;
  }) {
    return {
      id: notification.id,
      type: notification.type,
      channel: notification.channel,
      title: notification.title,
      body: notification.body,
      data: notification.data as Record<string, unknown> | null,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      deliveries: notification.deliveries?.map((d) => ({
        channel: d.channel,
        status: d.status,
        sentAt: d.sentAt?.toISOString() ?? null,
      })),
    };
  }
}
