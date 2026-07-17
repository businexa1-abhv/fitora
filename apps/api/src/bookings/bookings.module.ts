import { Module, forwardRef } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { FinanceModule } from '../finance/finance.module';
import { AvailabilityModule } from '../availability/availability.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BookingsController } from './bookings.controller';
import { WaitlistController } from './waitlist.controller';
import { BookingsService } from './bookings.service';
import { WaitlistService } from './waitlist.service';
import { RecurringBookingService } from './recurring-booking.service';

@Module({
  imports: [
    forwardRef(() => PaymentsModule),
    forwardRef(() => MembershipsModule),
    forwardRef(() => FinanceModule),
    NotificationsModule,
    AvailabilityModule,
    RealtimeModule,
  ],
  controllers: [BookingsController, WaitlistController],
  providers: [BookingsService, WaitlistService, RecurringBookingService],
  exports: [BookingsService, WaitlistService, RecurringBookingService],
})
export class BookingsModule {}
