import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OptionalAuth, Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, type AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import { SlotAvailabilityService } from './services/slot-availability.service';
import { VenueAvailabilityQueryDto } from '../slots/dto';

@ApiTags('availability')
@Controller()
export class SlotAvailabilityController {
  constructor(
    private readonly availability: SlotAvailabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @OptionalAuth()
  @Get('venues/:id/availability')
  @ApiOperation({ summary: 'Live venue availability for a date' })
  getVenueAvailability(@Param('id') id: string, @Query() query: VenueAvailabilityQueryDto) {
    return this.availability.getVenueAvailability(id, query.date);
  }

  @Get('courts/:courtId/slots/:slotId/availability')
  @ApiOperation({ summary: 'Live seat availability for a slot' })
  getAvailability(@Param('courtId') courtId: string, @Param('slotId') slotId: string) {
    return this.availability.getSlotAvailability(courtId, slotId);
  }

  @Post('bookings/:id/release-hold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Abandon checkout and release reserved seats' })
  async releaseHold(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, userId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('You can only release your own holds');
    }
    return this.availability.releaseReservation(id, { reason: 'abandoned' });
  }

  @Post('internal/availability/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Repair CourtSlot reserved/confirmed counters' })
  reconcile() {
    return this.availability.reconcileSlotCounters();
  }

  @Post('courts/:courtId/force-close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_APPROVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin force-close all slots for a court on a date' })
  forceClose(@Param('courtId') courtId: string, @Body() body: { date: string }) {
    return this.availability.forceCloseCourtSlots(courtId, body.date);
  }

  @Post('courts/:courtId/force-open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_APPROVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin force-open closed/blocked slots for a court on a date' })
  forceOpen(@Param('courtId') courtId: string, @Body() body: { date: string }) {
    return this.availability.forceOpenCourtSlots(courtId, body.date);
  }

  @Get('admin/occupancy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Live occupancy monitor across venues' })
  occupancyMonitor(@Query('date') date?: string, @Query('tenantId') tenantId?: string) {
    return this.availability.getAdminOccupancyMonitor(date, tenantId);
  }
}
