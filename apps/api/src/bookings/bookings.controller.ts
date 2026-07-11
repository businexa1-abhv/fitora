import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole, BookingStatus } from '@prisma/client';
import { Permission } from '@fitora/types';
import { Roles, RequirePermissions } from '../common/decorators';
import { AdminListQueryDto } from '../common/dto/admin-list-query.dto';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import {
  BookingConfirmationDto,
  BookingHistoryQueryDto,
  BookingResponseDto,
  CancelBookingDto,
  CheckInDto,
  CreateBookingDto,
  QrCodeResponseDto,
  RefundPreviewDto,
} from './dto';

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller()
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post('bookings')
  @RequirePermissions(Permission.BOOKINGS_WRITE)
  @ApiOperation({
    summary: 'Create booking — locks slot and initiates payment',
    description:
      'Player selects court + slot. Slot is locked for 15 minutes while payment completes.',
  })
  @ApiResponse({ status: 201, type: BookingConfirmationDto })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUserPayload) {
    return this.bookingsService.createBooking(dto, user.id);
  }

  @Get('bookings/my')
  @RequirePermissions(Permission.BOOKINGS_READ)
  @ApiOperation({ summary: 'Booking history with pagination and status filter' })
  history(@CurrentUser() user: AuthUserPayload, @Query() query: BookingHistoryQueryDto) {
    return this.bookingsService.getHistory(user.id, query);
  }

  @Get('bookings/admin/list')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Admin: paginated booking ledger' })
  adminList(@Query() query: AdminListQueryDto) {
    return this.bookingsService.adminListBookings({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status as BookingStatus | undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('bookings/owner/list')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Owner: paginated bookings across owned courts' })
  ownerList(@CurrentUser() user: AuthUserPayload, @Query() query: AdminListQueryDto) {
    return this.bookingsService.adminListBookings({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status as BookingStatus | undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      ownerId: user.id,
    });
  }

  @Get('bookings/:id')
  @RequirePermissions(Permission.BOOKINGS_READ)
  @ApiOperation({ summary: 'Get booking details' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.bookingsService.findOne(id, user);
  }

  @Get('bookings/:id/refund-preview')
  @RequirePermissions(Permission.BOOKINGS_READ)
  @ApiOperation({ summary: 'Preview refund amount based on cancellation policy' })
  @ApiResponse({ status: 200, type: RefundPreviewDto })
  refundPreview(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.bookingsService.getRefundPreview(id, user);
  }

  @Post('bookings/:id/cancel')
  @RequirePermissions(Permission.BOOKINGS_WRITE)
  @ApiOperation({ summary: 'Cancel booking and process refund per policy' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.bookingsService.cancelBooking(id, dto, user);
  }

  @Get('bookings/:id/qr')
  @RequirePermissions(Permission.BOOKINGS_READ)
  @ApiOperation({ summary: 'Generate QR code for venue check-in' })
  @ApiResponse({ status: 200, type: QrCodeResponseDto })
  getQr(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.bookingsService.getQrCode(id, user);
  }

  @Post('bookings/:id/check-in')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Check in player at venue (owner/admin)' })
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.bookingsService.checkIn(id, dto, user);
  }

  @Get('courts/:courtId/bookings')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'List all bookings for a court (owner/admin)' })
  courtBookings(@Param('courtId') courtId: string, @CurrentUser() user: AuthUserPayload) {
    return this.bookingsService.getCourtBookings(courtId, user);
  }
}
