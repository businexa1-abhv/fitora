import {
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OptionalAuth, Roles } from '../common/decorators';
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
}
