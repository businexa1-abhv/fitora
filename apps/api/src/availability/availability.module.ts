import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { SlotAvailabilityController } from './availability.controller';
import { SlotAvailabilityService } from './services/slot-availability.service';
import { SlotHoldService } from './services/slot-hold.service';

@Module({
  imports: [RealtimeModule],
  controllers: [SlotAvailabilityController],
  providers: [SlotAvailabilityService, SlotHoldService],
  exports: [SlotAvailabilityService, SlotHoldService],
})
export class AvailabilityModule {}
