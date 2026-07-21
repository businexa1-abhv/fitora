import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunityAnnouncementsService } from './community-announcements.service';
import { CreateAnnouncementDto } from './dto/community.dto';

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community/groups/:groupId/announcements')
export class CommunityAnnouncementsController {
  constructor(private readonly announcements: CommunityAnnouncementsService) {}

  @Post()
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  @ApiOperation({ summary: 'Create a group announcement' })
  create(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcements.create(user.id, groupId, dto);
  }

  @Get()
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'List group announcements' })
  list(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.announcements.list(user.id, groupId);
  }
}
