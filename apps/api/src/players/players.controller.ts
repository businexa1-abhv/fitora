import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUserPayload, Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';
import {
  NotificationOptInDto,
  UpdateFavoriteSportsDto,
  UpsertPlayerProfileDto,
} from './dto/player-profile.dto';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth('access-token')
@Controller('players')
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @Get('profile')
  @Roles(UserRole.PLAYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current player profile' })
  getProfile(@CurrentUser() user: AuthUserPayload) {
    return this.playersService.getProfile(user.id);
  }

  @Post('profile')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PLAYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create or update player profile (onboarding)' })
  upsertProfile(@CurrentUser() user: AuthUserPayload, @Body() dto: UpsertPlayerProfileDto) {
    return this.playersService.upsertProfile(user.id, dto);
  }

  @Put('profile/sports')
  @Roles(UserRole.PLAYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update favourite sports (1–10)' })
  updateSports(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateFavoriteSportsDto) {
    return this.playersService.updateFavoriteSports(user.id, dto);
  }

  @Post('profile/notifications')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PLAYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record notification permission preference and complete onboarding' })
  notifications(@CurrentUser() user: AuthUserPayload, @Body() dto: NotificationOptInDto) {
    return this.playersService.setNotificationsOptIn(user.id, dto);
  }

  @Post('profile/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PLAYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark player onboarding complete' })
  complete(@CurrentUser() user: AuthUserPayload) {
    return this.playersService.completeOnboarding(user.id);
  }
}
