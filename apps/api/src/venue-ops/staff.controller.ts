import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  CreateStaffShiftDto,
  StaffShiftQueryDto,
  StaffShiftResponseDto,
  UpdateStaffShiftDto,
} from './dto/venue-ops.dto';
import { StaffService } from './staff.service';

@ApiTags('venue-ops')
@ApiBearerAuth('access-token')
@Controller('staff/shifts')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get()
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'List staff shifts for tenant' })
  @ApiResponse({ status: 200, type: [StaffShiftResponseDto] })
  list(@CurrentUser() user: AuthUserPayload, @Query() query: StaffShiftQueryDto) {
    return this.staffService.list(user, query);
  }

  @Post()
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Create staff shift' })
  @ApiResponse({ status: 201, type: StaffShiftResponseDto })
  create(@Body() dto: CreateStaffShiftDto, @CurrentUser() user: AuthUserPayload) {
    return this.staffService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Update staff shift' })
  @ApiResponse({ status: 200, type: StaffShiftResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffShiftDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.staffService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Soft-delete staff shift' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.staffService.remove(id, user);
  }
}
