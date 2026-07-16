import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  CreatePlayerNoteDto,
  CrmPlayerSearchQueryDto,
  UpsertPlayerCrmProfileDto,
} from './dto/venue-ops.dto';
import { CrmService } from './crm.service';

@ApiTags('venue-ops')
@ApiBearerAuth('access-token')
@Controller('crm')
export class CrmController {
  constructor(private crmService: CrmService) {}

  @Get('players')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'List players who booked tenant courts' })
  listPlayers(@CurrentUser() user: AuthUserPayload, @Query() query: CrmPlayerSearchQueryDto) {
    return this.crmService.listPlayers(user, query);
  }

  @Get('players/:userId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Get player CRM profile and activity' })
  getPlayer(@Param('userId') userId: string, @CurrentUser() user: AuthUserPayload) {
    return this.crmService.getPlayer(userId, user);
  }

  @Put('players/:userId/profile')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Upsert player CRM profile' })
  upsertProfile(
    @Param('userId') userId: string,
    @Body() dto: UpsertPlayerCrmProfileDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.crmService.upsertProfile(userId, dto, user);
  }

  @Get('players/:userId/notes')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'List notes for a player' })
  listNotes(@Param('userId') userId: string, @CurrentUser() user: AuthUserPayload) {
    return this.crmService.listNotes(userId, user);
  }

  @Post('players/:userId/notes')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Create note for a player' })
  createNote(
    @Param('userId') userId: string,
    @Body() dto: CreatePlayerNoteDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.crmService.createNote(userId, dto, user);
  }

  @Delete('players/:userId/notes/:noteId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Soft-delete player note' })
  removeNote(
    @Param('userId') userId: string,
    @Param('noteId') noteId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.crmService.removeNote(userId, noteId, user);
  }
}
