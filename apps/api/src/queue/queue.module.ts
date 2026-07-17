import { Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AvailabilityModule } from '../availability/availability.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { FinanceModule } from '../finance/finance.module';
import { SlotsModule } from '../slots/slots.module';
import { BookingsModule } from '../bookings/bookings.module';
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
    AvailabilityModule,
    SlotsModule,
    forwardRef(() => BookingsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => PaymentsModule),
    forwardRef(() => FinanceModule),
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
