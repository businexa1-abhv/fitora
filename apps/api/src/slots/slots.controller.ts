import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { Roles, OptionalAuth, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { SlotsService } from './slots.service';
import {
  CalendarQueryDto,
  CreateClosureDto,
  CreatePricingRuleDto,
  CreateSlotDto,
  CreateSlotScheduleDto,
  GenerateRecurringSlotsDto,
  GenerateSlotsDto,
  SlotQueryDto,
  SlotResponseDto,
  UpdateClosureDto,
  UpdatePricingRuleDto,
  UpdateSlotDto,
  UpdateSlotScheduleDto,
} from './dto';

@ApiTags('slots')
@Controller()
export class SlotsController {
  constructor(private slotsService: SlotsService) {}

  // ─── Slots ──────────────────────────────────────────────────────────────────

  @OptionalAuth()
  @Get('courts/:courtId/slots')
  @ApiOperation({ summary: 'Get slots for a court on a date' })
  @ApiParam({ name: 'courtId', description: 'Court UUID' })
  @ApiQuery({ name: 'date', example: '2026-07-10', required: true })
  @ApiResponse({ status: 200, type: [SlotResponseDto] })
  getSlots(
    @Param('courtId') courtId: string,
    @Query() query: SlotQueryDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.slotsService.getSlots(courtId, query.date, user);
  }

  @OptionalAuth()
  @Get('courts/:courtId/slots/calendar')
  @ApiOperation({ summary: 'Calendar view with slots, closures, and availability summary' })
  @ApiParam({ name: 'courtId', description: 'Court UUID' })
  @ApiResponse({ status: 200, description: 'Calendar data' })
  getCalendar(
    @Param('courtId') courtId: string,
    @Query() query: CalendarQueryDto,
    @CurrentUser() user?: AuthUserPayload,
  ) {
    return this.slotsService.getCalendar(courtId, query, user);
  }

  @Post('courts/:courtId/slots')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a single slot' })
  @ApiResponse({ status: 201, type: SlotResponseDto })
  createSlot(
    @Param('courtId') courtId: string,
    @Body() dto: CreateSlotDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.createSlot(courtId, dto, user);
  }

  @Post('courts/:courtId/slots/generate')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate slots for a single date' })
  generateSlots(
    @Param('courtId') courtId: string,
    @Body() dto: GenerateSlotsDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.generateSlots(courtId, dto, user);
  }

  @Post('courts/:courtId/slots/recurring/generate')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate slots from recurring schedules over a date range' })
  generateRecurring(
    @Param('courtId') courtId: string,
    @Body() dto: GenerateRecurringSlotsDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.generateRecurringSlots(courtId, dto, user);
  }

  @Patch('courts/:courtId/slots/:slotId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update slot price, block status, or notes' })
  updateSlot(
    @Param('courtId') courtId: string,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateSlotDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.updateSlot(courtId, slotId, dto, user);
  }

  @Delete('courts/:courtId/slots/:slotId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete a slot' })
  removeSlot(
    @Param('courtId') courtId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.removeSlot(courtId, slotId, user);
  }

  // ─── Recurring schedules ────────────────────────────────────────────────────

  @Get('courts/:courtId/slot-schedules')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List recurring slot schedules' })
  listSchedules(@Param('courtId') courtId: string, @CurrentUser() user: AuthUserPayload) {
    return this.slotsService.listSchedules(courtId, user);
  }

  @Post('courts/:courtId/slot-schedules')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a recurring slot schedule' })
  createSchedule(
    @Param('courtId') courtId: string,
    @Body() dto: CreateSlotScheduleDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.createSchedule(courtId, dto, user);
  }

  @Put('courts/:courtId/slot-schedules/:scheduleId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a recurring schedule' })
  updateSchedule(
    @Param('courtId') courtId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateSlotScheduleDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.updateSchedule(courtId, scheduleId, dto, user);
  }

  @Delete('courts/:courtId/slot-schedules/:scheduleId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a recurring schedule' })
  removeSchedule(
    @Param('courtId') courtId: string,
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.removeSchedule(courtId, scheduleId, user);
  }

  // ─── Pricing rules ──────────────────────────────────────────────────────────

  @Get('courts/:courtId/pricing-rules')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List peak, weekend, and holiday pricing rules' })
  listPricingRules(@Param('courtId') courtId: string, @CurrentUser() user: AuthUserPayload) {
    return this.slotsService.listPricingRules(courtId, user);
  }

  @Post('courts/:courtId/pricing-rules')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a pricing rule (peak / weekend / holiday)' })
  createPricingRule(
    @Param('courtId') courtId: string,
    @Body() dto: CreatePricingRuleDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.createPricingRule(courtId, dto, user);
  }

  @Put('courts/:courtId/pricing-rules/:ruleId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a pricing rule' })
  updatePricingRule(
    @Param('courtId') courtId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdatePricingRuleDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.updatePricingRule(courtId, ruleId, dto, user);
  }

  @Delete('courts/:courtId/pricing-rules/:ruleId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a pricing rule' })
  removePricingRule(
    @Param('courtId') courtId: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.removePricingRule(courtId, ruleId, user);
  }

  // ─── Closures (blocked dates & maintenance) ─────────────────────────────────

  @Get('courts/:courtId/closures')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List blocked dates and maintenance windows' })
  listClosures(@Param('courtId') courtId: string, @CurrentUser() user: AuthUserPayload) {
    return this.slotsService.listClosures(courtId, user);
  }

  @Post('courts/:courtId/closures')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a blocked date or maintenance closure' })
  createClosure(
    @Param('courtId') courtId: string,
    @Body() dto: CreateClosureDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.createClosure(courtId, dto, user);
  }

  @Put('courts/:courtId/closures/:closureId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a closure' })
  updateClosure(
    @Param('courtId') courtId: string,
    @Param('closureId') closureId: string,
    @Body() dto: UpdateClosureDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.updateClosure(courtId, closureId, dto, user);
  }

  @Delete('courts/:courtId/closures/:closureId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COURTS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove a closure' })
  removeClosure(
    @Param('courtId') courtId: string,
    @Param('closureId') closureId: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.slotsService.removeClosure(courtId, closureId, user);
  }
}
