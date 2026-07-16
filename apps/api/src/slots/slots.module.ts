import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [AvailabilityModule, RealtimeModule],
  controllers: [SlotsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
