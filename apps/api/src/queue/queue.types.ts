import type { ScheduledJobName } from './queue.constants';

export type EmailJobData = {
  to: string;
  subject: string;
  body: string;
  notificationId?: string;
  deliveryId?: string;
};

export type SmsJobData = {
  phone: string;
  message: string;
  notificationId?: string;
  deliveryId?: string;
};

export type PushJobData = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  notificationId?: string;
  deliveryId?: string;
};

export type RefundJobData = {
  paymentId: string;
  amount: number;
  reason?: string;
  bookingId?: string;
};

export type PaymentRetryJobData = {
  paymentId?: string;
};

export type ScheduledJobPayload = {
  name: ScheduledJobName;
};

export type DeadLetterJobData = {
  sourceQueue: string;
  originalJobName: string;
  originalData: unknown;
  failedReason: string;
  failedAt: string;
  originalJobId?: string;
  attemptsMade: number;
};

export type QueueJobHandler = (jobName: string, data: unknown) => Promise<unknown>;
