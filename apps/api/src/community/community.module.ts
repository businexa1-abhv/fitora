import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CommunityAnnouncementsController } from './community-announcements.controller';
import { CommunityAnnouncementsService } from './community-announcements.service';
import { CommunityChatController } from './community-chat.controller';
import { CommunityChatService } from './community-chat.service';
import { CommunityFeedService } from './community-feed.service';
import { CommunityFriendsController } from './community-friends.controller';
import { CommunityFriendsService } from './community-friends.service';
import { CommunityGroupsController } from './community-groups.controller';
import { CommunityGroupsService } from './community-groups.service';
import { CommunityMatchesController } from './community-matches.controller';
import { CommunityMatchesService } from './community-matches.service';
import { CommunityModerationController } from './community-moderation.controller';
import { CommunityModerationService } from './community-moderation.service';
import { CommunitySearchController } from './community-search.controller';
import { CommunitySearchService } from './community-search.service';
import { CommunitySocialController } from './community-social.controller';
import { CommunitySocialService } from './community-social.service';

@Module({
  imports: [NotificationsModule, forwardRef(() => RealtimeModule)],
  controllers: [
    CommunityGroupsController,
    CommunityMatchesController,
    CommunityChatController,
    CommunityAnnouncementsController,
    CommunityFriendsController,
    CommunityModerationController,
    CommunitySearchController,
    CommunitySocialController,
  ],
  providers: [
    CommunityGroupsService,
    CommunityMatchesService,
    CommunityChatService,
    CommunityAnnouncementsService,
    CommunityFriendsService,
    CommunityModerationService,
    CommunitySearchService,
    CommunityFeedService,
    CommunitySocialService,
  ],
  exports: [
    CommunityGroupsService,
    CommunityMatchesService,
    CommunityChatService,
    CommunityAnnouncementsService,
    CommunityFriendsService,
    CommunityModerationService,
    CommunitySearchService,
    CommunityFeedService,
    CommunitySocialService,
  ],
})
export class CommunityModule {}
