import { Inject, Injectable, Logger, type OnModuleInit, forwardRef } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsPeriod } from '../analytics/analytics.constants';
import { RedisService } from '../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailProvider } from '../notifications/providers/email.provider';
import { PushProvider } from '../notifications/providers/push.provider';
import { SMS_PROVIDER, type SmsProvider } from '../notifications/providers/sms.provider';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.module';
import { SlotAvailabilityService } from '../availability/services/slot-availability.service';
import { SlotsService } from '../slots/slots.service';
import { WaitlistService } from '../bookings/waitlist.service';
import { SettlementService } from '../finance/settlement/settlement.service';
import { SubscriptionService } from '../finance/subscription/subscription.service';
import {
  CHANNEL_JOB_OPTIONS,
  QUEUES,
  REFUND_JOB_OPTIONS,
  SCHEDULED_JOBS,
  type ScheduledJobName,
} from './queue.constants';
import { QueueManagerService } from './queue-manager.service';
import type {
  EmailJobData,
  PaymentRetryJobData,
  PushJobData,
  RefundJobData,
  ScheduledJobPayload,
  SmsJobData,
} from './queue.types';

@Injectable()
export class QueueJobsService implements OnModuleInit {
  private readonly logger = new Logger(QueueJobsService.name);

  constructor(
    @Inject(QueueManagerService)
    private queueManager: QueueManagerService,
    @Inject(EmailProvider)
    private emailProvider: EmailProvider,
    @Inject(SMS_PROVIDER)
    private smsProvider: SmsProvider,
    @Inject(PushProvider)
    private pushProvider: PushProvider,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(AnalyticsService)
    private analyticsService: AnalyticsService,
    @Inject(PrismaService)
    private prisma: PrismaService,
    @Inject(RedisService)
    private redisService: RedisService,
    @Inject(SlotAvailabilityService)
    private slotAvailabilityService: SlotAvailabilityService,
    @Inject(SlotsService)
    private slotsService: SlotsService,
    @Inject(WaitlistService)
    private waitlistService: WaitlistService,
    @Inject(forwardRef(() => SettlementService))
    private settlementService: SettlementService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptionService: SubscriptionService,
  ) {}

  onModuleInit() {
    this.queueManager.registerHandler(QUEUES.EMAIL, (name, data) =>
      this.handleEmail(name, data as EmailJobData),
    );
    this.queueManager.registerHandler(QUEUES.SMS, (name, data) =>
      this.handleSms(name, data as SmsJobData),
    );
    this.queueManager.registerHandler(QUEUES.PUSH, (name, data) =>
      this.handlePush(name, data as PushJobData),
    );
    this.queueManager.registerHandler(QUEUES.SCHEDULED, (name, data) =>
      this.handleScheduled(name, data as ScheduledJobPayload),
    );
    this.queueManager.registerHandler(QUEUES.REFUND, (name, data) =>
      this.handleRefund(name, data as RefundJobData),
    );
    this.queueManager.registerHandler(QUEUES.PAYMENT_RETRY, (name, data) =>
      this.handlePaymentRetry(name, data as PaymentRetryJobData),
    );
  }

  enqueueEmail(data: EmailJobData) {
    return this.queueManager.addJob(QUEUES.EMAIL, 'send', data, CHANNEL_JOB_OPTIONS);
  }

  enqueueSms(data: SmsJobData) {
    return this.queueManager.addJob(QUEUES.SMS, 'send', data, CHANNEL_JOB_OPTIONS);
  }

  enqueuePush(data: PushJobData) {
    return this.queueManager.addJob(QUEUES.PUSH, 'send', data, CHANNEL_JOB_OPTIONS);
  }

  enqueueRefund(data: RefundJobData) {
    return this.queueManager.addJob(QUEUES.REFUND, 'process-refund', data, REFUND_JOB_OPTIONS);
  }

  enqueuePaymentRetry(data: PaymentRetryJobData = {}) {
    return this.queueManager.addJob(QUEUES.PAYMENT_RETRY, 'retry', data, REFUND_JOB_OPTIONS);
  }

  private async handleEmail(_name: string, data: EmailJobData) {
    const ok = await this.emailProvider.send(data.to, data.subject, data.body);
    if (!ok) throw new Error('Email provider returned failure');
    if (data.deliveryId) {
      await this.notificationsService.markDeliverySent(data.deliveryId, ok);
    }
    return { sent: true };
  }

  private async handleSms(_name: string, data: SmsJobData) {
    const ok = await this.smsProvider.send(data.phone, data.message);
    if (!ok) throw new Error('SMS provider returned failure');
    if (data.deliveryId) {
      await this.notificationsService.markDeliverySent(data.deliveryId, ok);
    }
    return { sent: true };
  }

  private async handlePush(_name: string, data: PushJobData) {
    await this.pushProvider.sendToUser(data.userId, data.title, data.body, data.data);
    if (data.deliveryId) {
      await this.notificationsService.markDeliverySent(data.deliveryId, true);
    }
    return { sent: true };
  }

  private async handleRefund(_name: string, data: RefundJobData) {
    return this.paymentsService.refundPayment(data.paymentId, data.amount, data.reason);
  }

  private async handlePaymentRetry(_name: string, data: PaymentRetryJobData) {
    if (data.paymentId) {
      return this.paymentsService.retryPayment(data.paymentId);
    }
    return this.paymentsService.retryFailedPayments();
  }

  private async handleScheduled(_name: string, data: ScheduledJobPayload) {
    const jobName = data.name;
    this.logger.log(`Running scheduled job: ${jobName}`);

    switch (jobName as ScheduledJobName) {
      case SCHEDULED_JOBS.BOOKING_REMINDER:
        return this.notificationsService.sendBookingReminders();
      case SCHEDULED_JOBS.MEMBERSHIP_EXPIRING:
        return this.notificationsService.sendMembershipExpiringReminders();
      case SCHEDULED_JOBS.MEMBERSHIP_EXPIRY:
        return this.notificationsService.expireMembershipsWithNotification();
      case SCHEDULED_JOBS.TRAINING_REMINDER:
        return this.notificationsService.sendTrainingReminders();
      case SCHEDULED_JOBS.PROCESS_SCHEDULED_BROADCASTS:
        return this.notificationsService.processScheduledBroadcasts();
      case SCHEDULED_JOBS.PAYMENT_RETRY:
        return this.paymentsService.retryFailedPayments();
      case SCHEDULED_JOBS.DAILY_REPORTS:
        return this.generateDailyReports();
      case SCHEDULED_JOBS.ANALYTICS_AGGREGATION:
        return this.aggregateAnalytics();
      case SCHEDULED_JOBS.SLOT_GENERATION:
        return this.slotsService.autoGenerateUpcomingSlots(14);
      case SCHEDULED_JOBS.RELEASE_EXPIRED_LOCKS:
        return this.runReleaseExpiredLocks();
      case SCHEDULED_JOBS.WEEKLY_SETTLEMENT:
        return this.settlementService.processDueSettlements();
      case SCHEDULED_JOBS.SUBSCRIPTION_EXPIRY:
        return this.subscriptionService.processExpiries();
      default:
        this.logger.warn(`Unknown scheduled job: ${jobName}`);
    }
  }

  private async generateDailyReports() {
    const reports = await this.paymentsService.getPaymentReports({ days: 30 });
    const dashboard = await this.analyticsService.getDashboard({ period: AnalyticsPeriod.DAILY });
    const payload = {
      generatedAt: new Date().toISOString(),
      paymentReports: reports,
      overview: dashboard.overview,
    };

    const client = this.redisService.getClient();
    if (client) {
      const key = `reports:daily:${new Date().toISOString().slice(0, 10)}`;
      await client.set(key, JSON.stringify(payload), 'EX', 60 * 60 * 24 * 7);
    }

    this.logger.log('Daily report generated');
    return payload;
  }

  private async aggregateAnalytics() {
    const dashboard = await this.analyticsService.getDashboard({ period: AnalyticsPeriod.MONTHLY });
    const payload = {
      aggregatedAt: new Date().toISOString(),
      overview: dashboard.overview,
      revenue: dashboard.revenue.total,
      bookings: dashboard.bookings.total,
      users: dashboard.users.newUsers,
    };

    const client = this.redisService.getClient();
    if (client) {
      const key = `analytics:aggregated:${new Date().toISOString().slice(0, 10)}`;
      await client.set(key, JSON.stringify(payload), 'EX', 60 * 60 * 24 * 30);
    }

    this.logger.log('Analytics aggregation complete');
    return payload;
  }

  private async runReleaseExpiredLocks() {
    const locks = await this.slotAvailabilityService.releaseExpiredLocks();
    const waitlist = await this.waitlistService.expireStaleOffers();
    return { locks, waitlist };
  }
}
