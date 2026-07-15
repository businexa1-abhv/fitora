import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { CurrentUser, RequirePermissions, Roles, type AuthUserPayload } from '../common/decorators';
import {
  type ListPartnerApplicationsQueryDto,
  type RejectPartnerApplicationDto,
} from './dto/admin-partner.dto';
import { PartnerOnboardingService } from './partner-onboarding.service';

@ApiTags('Admin Partner Applications')
@ApiBearerAuth('access-token')
@Controller('admin/partner-applications')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.TENANTS_MANAGE)
export class AdminPartnerApplicationsController {
  constructor(private readonly partnerOnboardingService: PartnerOnboardingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Partner verification hub stats' })
  stats() {
    return this.partnerOnboardingService.getAdminStats();
  }

  @Get()
  @ApiOperation({ summary: 'List partner applications for admin review' })
  list(@Query() query: ListPartnerApplicationsQueryDto) {
    return this.partnerOnboardingService.listForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner application details' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerOnboardingService.getForAdmin(id);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve partner application (activate tenant + approve all courts)',
  })
  @RequirePermissions(Permission.TENANTS_MANAGE, Permission.COURTS_APPROVE)
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUserPayload) {
    return this.partnerOnboardingService.approveApplication(id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject partner application' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPartnerApplicationDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.partnerOnboardingService.rejectApplication(id, dto, user.id);
  }
}
