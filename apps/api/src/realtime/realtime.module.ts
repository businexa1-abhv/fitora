import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeOutboxService } from './realtime-outbox.service';
import { SlotEventsService } from './slot-events.service';
import { SlotsGateway } from './slots.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeOutboxService, SlotEventsService, SlotsGateway],
  exports: [SlotEventsService, RealtimeOutboxService],
})
export class RealtimeModule {}
