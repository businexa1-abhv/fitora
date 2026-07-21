import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommunityEventsService } from './community-events.service';
import { CommunityGateway } from './community.gateway';
import { RealtimeOutboxService } from './realtime-outbox.service';
import { SlotEventsService } from './slot-events.service';
import { SlotsGateway } from './slots.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    RealtimeOutboxService,
    SlotEventsService,
    SlotsGateway,
    CommunityEventsService,
    CommunityGateway,
  ],
  exports: [SlotEventsService, RealtimeOutboxService, CommunityEventsService],
})
export class RealtimeModule {}
