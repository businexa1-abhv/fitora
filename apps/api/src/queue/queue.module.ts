import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailProvider } from '../notifications/providers/email.provider';
import { PushProvider } from '../notifications/providers/push.provider';
import { smsProviderProviders } from '../notifications/providers/sms.provider';
import { QueueController } from './queue.controller';
import { QueueJobsService } from './queue-jobs.service';
import { QueueManagerService } from './queue-manager.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    AnalyticsModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [QueueController],
  providers: [
    QueueManagerService,
    QueueJobsService,
    EmailProvider,
    ...smsProviderProviders,
    PushProvider,
  ],
  exports: [QueueManagerService, QueueJobsService],
})
export class QueueModule {}
