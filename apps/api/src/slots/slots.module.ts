import { Module, forwardRef } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { FinanceModule } from '../finance/finance.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [AvailabilityModule, RealtimeModule, forwardRef(() => FinanceModule)],
  controllers: [SlotsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
