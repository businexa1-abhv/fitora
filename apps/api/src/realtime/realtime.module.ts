import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SlotEventsService } from './slot-events.service';
import { SlotsGateway } from './slots.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [SlotEventsService, SlotsGateway],
  exports: [SlotEventsService],
})
export class RealtimeModule {}
