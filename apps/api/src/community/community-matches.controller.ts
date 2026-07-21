import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunityMatchesService } from './community-matches.service';
import {
  CheckInDto,
  CreateMatchDto,
  CreateMatchFromBookingDto,
  RsvpDto,
} from './dto/community.dto';

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community/matches')
export class CommunityMatchesController {
  constructor(private readonly matches: CommunityMatchesService) {}

  @Post()
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Schedule a community match' })
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateMatchDto) {
    return this.matches.createMatch(user.id, dto);
  }

  @Post('from-booking')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Create match from an existing booking' })
  fromBooking(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateMatchFromBookingDto) {
    return this.matches.createFromBooking(user.id, dto);
  }

  @Get('need-players')
  @RequirePermissions(Permission.COMMUNITY_READ)
  needPlayers(@CurrentUser() user: AuthUserPayload) {
    return this.matches.listNeedPlayers(user.id);
  }

  @Get(':matchId')
  @RequirePermissions(Permission.COMMUNITY_READ)
  get(@CurrentUser() user: AuthUserPayload, @Param('matchId') matchId: string) {
    return this.matches.getMatch(user.id, matchId);
  }

  @Patch(':matchId')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('matchId') matchId: string,
    @Body() dto: CreateMatchDto,
  ) {
    return this.matches.updateMatch(user.id, matchId, dto);
  }

  @Post(':matchId/rsvp')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  rsvp(
    @CurrentUser() user: AuthUserPayload,
    @Param('matchId') matchId: string,
    @Body() dto: RsvpDto,
  ) {
    return this.matches.rsvp(user.id, matchId, dto);
  }

  @Post(':matchId/start')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  start(@CurrentUser() user: AuthUserPayload, @Param('matchId') matchId: string) {
    return this.matches.startMatch(user.id, matchId);
  }

  @Post(':matchId/complete')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  complete(@CurrentUser() user: AuthUserPayload, @Param('matchId') matchId: string) {
    return this.matches.completeMatch(user.id, matchId);
  }

  @Post(':matchId/cancel')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  cancel(@CurrentUser() user: AuthUserPayload, @Param('matchId') matchId: string) {
    return this.matches.cancelMatch(user.id, matchId);
  }

  @Post(':matchId/check-in')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  checkIn(
    @CurrentUser() user: AuthUserPayload,
    @Param('matchId') matchId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.matches.checkIn(user.id, matchId, dto);
  }
}
