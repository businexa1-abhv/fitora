import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type Job, type JobsOptions, Queue, Worker } from 'bullmq';
import { type RedisService } from '../common/redis/redis.service';
import {
  ALL_WORKER_QUEUES,
  CRON_PATTERNS,
  DEFAULT_JOB_OPTIONS,
  QUEUES,
  QUEUE_LABELS,
  SCHEDULED_JOBS,
  type ScheduledJobName,
} from './queue.constants';
import type { DeadLetterJobData, QueueJobHandler } from './queue.types';

@Injectable()
export class QueueManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueManagerService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private deadLetterQueue: Queue | null = null;
  private inlineMode = true;
  private handlers = new Map<string, QueueJobHandler>();

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  registerHandler(queueName: string, handler: QueueJobHandler) {
    this.handlers.set(queueName, handler);
  }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl || !this.redisService.isAvailable() || this.redisService.usesMemoryFallback()) {
      this.inlineMode = true;
      this.logger.warn('Redis unavailable — BullMQ jobs run inline (development mode)');
      return;
    }

    this.inlineMode = false;
    const connection = { url: redisUrl };

    this.deadLetterQueue = new Queue(QUEUES.DEAD_LETTER, { connection });

    for (const queueName of ALL_WORKER_QUEUES) {
      const queue = new Queue(queueName, { connection });
      this.queues.set(queueName, queue);

      const concurrency = queueName === QUEUES.SCHEDULED ? 1 : queueName === QUEUES.REFUND ? 2 : 5;

      const worker = new Worker(
        queueName,
        async (job: Job) => {
          const handler = this.handlers.get(queueName);
          if (!handler) {
            this.logger.warn(`No handler registered for queue ${queueName}`);
            return;
          }
          return handler(job.name, job.data);
        },
        { connection, concurrency },
      );

      worker.on('failed', (job, err) => {
        void this.handleFailedJob(queueName, job, err);
      });

      this.workers.set(queueName, worker);
    }

    await this.registerCronJobs();
    this.logger.log(`BullMQ started — ${ALL_WORKER_QUEUES.length} workers + DLQ`);
  }

  private async registerCronJobs() {
    const scheduledQueue = this.queues.get(QUEUES.SCHEDULED);
    if (!scheduledQueue) return;

    for (const [name, pattern] of Object.entries(CRON_PATTERNS) as [ScheduledJobName, string][]) {
      await scheduledQueue.add(
        name,
        { name },
        {
          repeat: { pattern },
          jobId: `cron-${name}`,
          ...DEFAULT_JOB_OPTIONS,
        },
      );
    }

    const paymentRetryQueue = this.queues.get(QUEUES.PAYMENT_RETRY);
    if (paymentRetryQueue) {
      await paymentRetryQueue.add(
        SCHEDULED_JOBS.PAYMENT_RETRY,
        { name: SCHEDULED_JOBS.PAYMENT_RETRY },
        {
          repeat: { pattern: CRON_PATTERNS[SCHEDULED_JOBS.PAYMENT_RETRY] },
          jobId: 'cron-payment-retry-worker',
          ...DEFAULT_JOB_OPTIONS,
        },
      );
    }
  }

  private async handleFailedJob(queueName: string, job: Job | undefined, error: Error) {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;

    this.logger.error(`Job ${job.id} on ${queueName} exhausted retries: ${error.message}`);
    await this.moveToDeadLetter(queueName, job, error.message);
  }

  async moveToDeadLetter(sourceQueue: string, job: Job, failedReason: string) {
    const payload: DeadLetterJobData = {
      sourceQueue,
      originalJobName: job.name,
      originalData: job.data,
      failedReason,
      failedAt: new Date().toISOString(),
      originalJobId: job.id,
      attemptsMade: job.attemptsMade,
    };

    if (this.deadLetterQueue) {
      await this.deadLetterQueue.add('dead-letter', payload, {
        removeOnComplete: { count: 1000 },
        removeOnFail: false,
      });
      return;
    }

    this.logger.error(`[DLQ inline] ${sourceQueue}/${job.name}: ${failedReason}`);
  }

  async addJob<T extends Record<string, unknown>>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobsOptions,
  ) {
    if (this.inlineMode) {
      const handler = this.handlers.get(queueName);
      if (!handler) {
        this.logger.warn(`Inline: no handler for ${queueName}`);
        return null;
      }
      return handler(jobName, data);
    }

    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue not found: ${queueName}`);

    return queue.add(jobName, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });
  }

  async triggerScheduledJob(name: ScheduledJobName) {
    return this.addJob(QUEUES.SCHEDULED, name, { name });
  }

  async getMonitoringDashboard() {
    if (this.inlineMode) {
      return {
        mode: 'inline' as const,
        redisConnected: false,
        queues: ALL_WORKER_QUEUES.map((name) => ({
          name,
          label: QUEUE_LABELS[name] ?? name,
          counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        })),
        deadLetter: { waiting: 0, total: 0, recent: [] as unknown[] },
      };
    }

    const queueStats = await Promise.all(
      [...ALL_WORKER_QUEUES, QUEUES.DEAD_LETTER].map(async (name) => {
        const queue = name === QUEUES.DEAD_LETTER ? this.deadLetterQueue : this.queues.get(name);
        if (!queue) return { name, counts: {} };
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
        );
        return { name, counts };
      }),
    );

    const dlqJobs = this.deadLetterQueue
      ? await this.deadLetterQueue.getJobs(['waiting', 'delayed'], 0, 20)
      : [];

    return {
      mode: 'bullmq' as const,
      redisConnected: this.redisService.isAvailable(),
      queues: queueStats.map((q) => ({
        name: q.name,
        label: QUEUE_LABELS[q.name] ?? q.name,
        counts: q.counts,
      })),
      deadLetter: {
        waiting: queueStats.find((q) => q.name === QUEUES.DEAD_LETTER)?.counts?.waiting ?? 0,
        total: dlqJobs.length,
        recent: await Promise.all(dlqJobs.map((j) => this.formatDeadLetterJob(j))),
      },
    };
  }

  async getDeadLetterJobs(page = 1, pageSize = 20) {
    if (!this.deadLetterQueue || this.inlineMode) {
      return { items: [], total: 0, page, pageSize };
    }

    const start = (page - 1) * pageSize;
    const jobs = await this.deadLetterQueue.getJobs(
      ['waiting', 'delayed', 'failed'],
      start,
      start + pageSize - 1,
    );
    const total = await this.deadLetterQueue.getJobCounts('waiting', 'delayed', 'failed');

    return {
      items: await Promise.all(jobs.map((j) => this.formatDeadLetterJob(j))),
      total: (total.waiting ?? 0) + (total.delayed ?? 0) + (total.failed ?? 0),
      page,
      pageSize,
    };
  }

  async retryDeadLetterJob(jobId: string) {
    if (!this.deadLetterQueue || this.inlineMode) {
      throw new Error('Dead letter queue unavailable in inline mode');
    }

    const dlqJob = await this.deadLetterQueue.getJob(jobId);
    if (!dlqJob) throw new Error('DLQ job not found');

    const data = dlqJob.data as DeadLetterJobData;
    const targetQueue = this.queues.get(data.sourceQueue);
    if (!targetQueue) throw new Error(`Source queue ${data.sourceQueue} not found`);

    await targetQueue.add(data.originalJobName, data.originalData as Record<string, unknown>, {
      ...DEFAULT_JOB_OPTIONS,
    });
    await dlqJob.remove();

    return { retried: true, sourceQueue: data.sourceQueue, jobName: data.originalJobName };
  }

  private async formatDeadLetterJob(job: Job) {
    const data = job.data as DeadLetterJobData;
    return {
      id: job.id,
      sourceQueue: data.sourceQueue,
      originalJobName: data.originalJobName,
      failedReason: data.failedReason,
      failedAt: data.failedAt,
      attemptsMade: data.attemptsMade,
      originalJobId: data.originalJobId,
    };
  }

  /** @deprecated Use getMonitoringDashboard */
  async getQueueStats() {
    const dashboard = await this.getMonitoringDashboard();
    return dashboard;
  }

  async onModuleDestroy() {
    await Promise.all([
      ...[...this.workers.values()].map((w) => w.close()),
      ...[...this.queues.values()].map((q) => q.close()),
      this.deadLetterQueue?.close(),
    ]);
  }
}
