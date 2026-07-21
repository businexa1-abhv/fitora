import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Permission } from '@fitora/types';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunitySocialService } from './community-social.service';
import { CreatePollDto, VotePollDto } from './dto/community.dto';

class AddMediaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  url!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  kind?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  matchId?: string;
}

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community')
export class CommunitySocialController {
  constructor(private readonly social: CommunitySocialService) {}

  @Get('groups/:groupId/media')
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'List group media' })
  listMedia(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.social.listMedia(user.id, groupId);
  }

  @Post('groups/:groupId/media')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Add media to a group' })
  addMedia(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: AddMediaDto,
  ) {
    return this.social.addMedia(user.id, groupId, dto);
  }

  @Get('groups/:groupId/polls')
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'List group polls' })
  listPolls(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.social.listPolls(user.id, groupId);
  }

  @Post('groups/:groupId/polls')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  @ApiOperation({ summary: 'Create a group poll' })
  createPoll(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.social.createPoll(user.id, groupId, dto);
  }

  @Post('polls/:pollId/vote')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Vote on a poll' })
  vote(
    @CurrentUser() user: AuthUserPayload,
    @Param('pollId') pollId: string,
    @Body() dto: VotePollDto,
  ) {
    return this.social.votePoll(user.id, pollId, dto);
  }

  @Get('groups/:groupId/leaderboard')
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'Group leaderboard' })
  leaderboard(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.social.listLeaderboard(user.id, groupId);
  }
}
