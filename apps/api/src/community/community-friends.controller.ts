import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunityFriendsService } from './community-friends.service';
import { BlockDto, FriendRequestDto, PaginationDto } from './dto/community.dto';

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community/friends')
export class CommunityFriendsController {
  constructor(private readonly friends: CommunityFriendsService) {}

  @Post('request')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  request(@CurrentUser() user: AuthUserPayload, @Body() dto: FriendRequestDto) {
    return this.friends.sendRequest(user.id, dto);
  }

  @Post(':friendshipId/accept')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  accept(@CurrentUser() user: AuthUserPayload, @Param('friendshipId') friendshipId: string) {
    return this.friends.accept(user.id, friendshipId);
  }

  @Post(':friendshipId/decline')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  decline(@CurrentUser() user: AuthUserPayload, @Param('friendshipId') friendshipId: string) {
    return this.friends.decline(user.id, friendshipId);
  }

  @Get()
  @RequirePermissions(Permission.COMMUNITY_READ)
  list(@CurrentUser() user: AuthUserPayload) {
    return this.friends.list(user.id);
  }

  @Get('pending')
  @RequirePermissions(Permission.COMMUNITY_READ)
  pending(@CurrentUser() user: AuthUserPayload) {
    return this.friends.listPending(user.id);
  }

  @Get('nearby')
  @RequirePermissions(Permission.COMMUNITY_READ)
  nearby(@CurrentUser() user: AuthUserPayload, @Query() query: PaginationDto & { city?: string }) {
    return this.friends.nearby(user.id, query.city);
  }

  @Get('playing-today')
  @RequirePermissions(Permission.COMMUNITY_READ)
  playingToday(@CurrentUser() user: AuthUserPayload) {
    return this.friends.playingToday(user.id);
  }

  @Post('block')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  block(@CurrentUser() user: AuthUserPayload, @Body() dto: BlockDto) {
    return this.friends.block(user.id, dto);
  }
}
