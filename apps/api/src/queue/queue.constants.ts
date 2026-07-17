export const QUEUES = {
  EMAIL: 'fitora-email',
  SMS: 'fitora-sms',
  PUSH: 'fitora-push',
  SCHEDULED: 'fitora-scheduled',
  REFUND: 'fitora-refund',
  PAYMENT_RETRY: 'fitora-payment-retry',
  DEAD_LETTER: 'fitora-dead-letter',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const SCHEDULED_JOBS = {
  BOOKING_REMINDER: 'booking-reminder',
  MEMBERSHIP_EXPIRY: 'membership-expiry',
  MEMBERSHIP_EXPIRING: 'membership-expiring',
  TRAINING_REMINDER: 'training-reminder',
  PAYMENT_RETRY: 'payment-retry',
  DAILY_REPORTS: 'daily-reports',
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
  PROCESS_SCHEDULED_BROADCASTS: 'process-scheduled-broadcasts',
  SLOT_GENERATION: 'slot-generation',
  RELEASE_EXPIRED_LOCKS: 'release-expired-locks',
  WEEKLY_SETTLEMENT: 'weekly-settlement',
  SUBSCRIPTION_EXPIRY: 'subscription-expiry',
} as const;

export type ScheduledJobName = (typeof SCHEDULED_JOBS)[keyof typeof SCHEDULED_JOBS];

export const CRON_PATTERNS: Record<ScheduledJobName, string> = {
  [SCHEDULED_JOBS.BOOKING_REMINDER]: '0 * * * *',
  [SCHEDULED_JOBS.MEMBERSHIP_EXPIRING]: '0 9 * * *',
  [SCHEDULED_JOBS.MEMBERSHIP_EXPIRY]: '30 9 * * *',
  [SCHEDULED_JOBS.TRAINING_REMINDER]: '0 8 * * *',
  [SCHEDULED_JOBS.PAYMENT_RETRY]: '*/15 * * * *',
  [SCHEDULED_JOBS.DAILY_REPORTS]: '0 6 * * *',
  [SCHEDULED_JOBS.ANALYTICS_AGGREGATION]: '0 5 * * *',
  [SCHEDULED_JOBS.PROCESS_SCHEDULED_BROADCASTS]: '*/5 * * * *',
  [SCHEDULED_JOBS.SLOT_GENERATION]: '0 2 * * *',
  [SCHEDULED_JOBS.RELEASE_EXPIRED_LOCKS]: '*/5 * * * *',
  [SCHEDULED_JOBS.WEEKLY_SETTLEMENT]: '0 3 * * 1',
  [SCHEDULED_JOBS.SUBSCRIPTION_EXPIRY]: '0 10 * * *',
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

export const CHANNEL_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 500 },
};

export const REFUND_JOB_OPTIONS = {
  attempts: 6,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

export const ALL_WORKER_QUEUES = [
  QUEUES.EMAIL,
  QUEUES.SMS,
  QUEUES.PUSH,
  QUEUES.SCHEDULED,
  QUEUES.REFUND,
  QUEUES.PAYMENT_RETRY,
] as const;

export const QUEUE_LABELS: Record<string, string> = {
  [QUEUES.EMAIL]: 'Email',
  [QUEUES.SMS]: 'SMS',
  [QUEUES.PUSH]: 'Push notifications',
  [QUEUES.SCHEDULED]: 'Scheduled jobs',
  [QUEUES.REFUND]: 'Refund processing',
  [QUEUES.PAYMENT_RETRY]: 'Payment retry',
  [QUEUES.DEAD_LETTER]: 'Dead letter queue',
};
