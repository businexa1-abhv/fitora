import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunityModerationService } from './community-moderation.service';
import { ReportDto } from './dto/community.dto';

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community/reports')
export class CommunityModerationController {
  constructor(private readonly moderation: CommunityModerationService) {}

  @Post()
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Report a user, message, group, or match' })
  report(@CurrentUser() user: AuthUserPayload, @Body() dto: ReportDto) {
    return this.moderation.report(user.id, dto);
  }
}
