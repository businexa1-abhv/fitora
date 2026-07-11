import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrintController } from './print.controller';
import { PrintService } from './print.service';

@Module({
  imports: [forwardRef(() => PaymentsModule), NotificationsModule],
  controllers: [PrintController],
  providers: [PrintService],
  exports: [PrintService],
})
export class PrintModule {}
