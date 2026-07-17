import { Module, forwardRef } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ShopModule } from '../shop/shop.module';
import { PrintModule } from '../print/print.module';
import { ServicesModule } from '../services/services.module';
import { TrainingModule } from '../training/training.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { FinanceModule } from '../finance/finance.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    forwardRef(() => BookingsModule),
    forwardRef(() => TrainingModule),
    forwardRef(() => ShopModule),
    forwardRef(() => PrintModule),
    forwardRef(() => ServicesModule),
    NotificationsModule,
    forwardRef(() => WalletModule),
    RealtimeModule,
    forwardRef(() => FinanceModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
