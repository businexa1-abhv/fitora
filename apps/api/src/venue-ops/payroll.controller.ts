import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { UpdatePayrollLineDto } from './dto/venue-ops.dto';
import { PayrollService } from './payroll.service';

@ApiTags('venue-ops')
@ApiBearerAuth('access-token')
@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Get('periods/current')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Get or create open payroll period for last 14 days' })
  getCurrentPeriod(@CurrentUser() user: AuthUserPayload) {
    return this.payrollService.getCurrentPeriod(user);
  }

  @Get('periods/:id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Get payroll period by id' })
  getPeriod(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.payrollService.getPeriodById(id, user);
  }

  @Post('periods/:id/generate')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Rebuild payroll lines from tenant trainers' })
  regenerate(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.payrollService.regeneratePeriod(id, user);
  }

  @Patch('lines/:id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Update payroll line status' })
  updateLine(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollLineDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.payrollService.updateLine(id, dto, user);
  }
}
