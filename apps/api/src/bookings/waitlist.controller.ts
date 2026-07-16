import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { JoinWaitlistDto } from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';

@ApiTags('waitlist')
@ApiBearerAuth('access-token')
@Controller()
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Post('courts/:courtId/slots/:slotId/waitlist')
  @RequirePermissions(Permission.BOOKINGS_WRITE)
  @ApiOperation({ summary: 'Join waitlist for a full slot' })
  @ApiParam({ name: 'courtId', description: 'Court UUID' })
  @ApiParam({ name: 'slotId', description: 'Slot UUID' })
  join(
    @Param('courtId') courtId: string,
    @Param('slotId') slotId: string,
    @Body() dto: JoinWaitlistDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.waitlistService.join(courtId, slotId, user.id, dto.seats ?? 1);
  }

  @Delete('waitlist/:id')
  @RequirePermissions(Permission.BOOKINGS_WRITE)
  @ApiOperation({ summary: 'Leave a waitlist entry' })
  leave(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.waitlistService.leave(id, user.id);
  }

  @Get('waitlist/my')
  @RequirePermissions(Permission.BOOKINGS_READ)
  @ApiOperation({ summary: 'List current player waitlist entries' })
  my(@CurrentUser() user: AuthUserPayload) {
    return this.waitlistService.getMyEntries(user.id);
  }

  @Get('courts/:courtId/slots/:slotId/waitlist')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Owner view of slot waitlist' })
  slotWaitlist(
    @Param('courtId') courtId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.waitlistService.getSlotWaitlist(courtId, slotId, user);
  }
}
