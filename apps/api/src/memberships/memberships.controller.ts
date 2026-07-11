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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { Public, Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  CouponQueryDto,
  CouponResponseDto,
  UpdateCouponDto,
} from './dto/coupon.dto';
import {
  CreateMembershipPlanDto,
  MembershipDashboardDto,
  MembershipDashboardQueryDto,
  MembershipPlanResponseDto,
  MembershipUsageResponseDto,
  PurchaseMembershipDto,
  RenewMembershipDto,
  SetAutoRenewDto,
  UpdateMembershipPlanDto,
  ValidateCouponDto,
} from './dto/membership.dto';
import { MembershipsService } from './memberships.service';
import { AdminListQueryDto } from '../common/dto/admin-list-query.dto';

@ApiTags('memberships')
@Controller()
export class MembershipsController {
  constructor(
    private membershipsService: MembershipsService,
    private couponsService: CouponsService,
  ) {}

  // ─── Plans ────────────────────────────────────────────────────────────────────

  @Public()
  @Get('courts/:courtId/memberships')
  @ApiOperation({ summary: 'List active membership plans for a court' })
  @ApiResponse({ status: 200, type: [MembershipPlanResponseDto] })
  getPlans(@Param('courtId') courtId: string) {
    return this.membershipsService.getPlansByCourt(courtId);
  }

  @Get('memberships/plans/mine')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.MEMBERSHIPS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all plans across owner courts' })
  getMyPlans(@CurrentUser() user: AuthUserPayload) {
    return this.membershipsService.getMyPlans(user.id);
  }

  @Get('memberships/plans/:planId/subscribers')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.MEMBERSHIPS_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List subscribers for a plan' })
  getSubscribers(@Param('planId') planId: string, @CurrentUser() user: AuthUserPayload) {
    return this.membershipsService.getSubscribers(planId, user);
  }

  @Get('memberships/plans/:planId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get membership plan details' })
  getPlan(@Param('planId') planId: string) {
    return this.membershipsService.getPlan(planId);
  }

  @Post('courts/:courtId/memberships')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.MEMBERSHIPS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create membership plan (hourly → yearly)' })
  createPlan(
    @Param('courtId') courtId: string,
    @Body() dto: CreateMembershipPlanDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.membershipsService.createPlan(courtId, dto, user);
  }

  @Put('memberships/plans/:planId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.MEMBERSHIPS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update membership plan' })
  updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdateMembershipPlanDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.membershipsService.updatePlan(planId, dto, user);
  }

  @Delete('memberships/plans/:planId')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.MEMBERSHIPS_WRITE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete membership plan' })
  deletePlan(@Param('planId') planId: string, @CurrentUser() user: AuthUserPayload) {
    return this.membershipsService.deletePlan(planId, user);
  }

  // ─── Dashboard & coupons (static routes before :id) ───────────────────────────

  @Get('memberships/dashboard')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.MEMBERSHIPS_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Owner membership dashboard stats' })
  @ApiResponse({ status: 200, type: MembershipDashboardDto })
  getDashboard(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: MembershipDashboardQueryDto,
  ) {
    return this.membershipsService.getDashboard(user, query);
  }

  @Post('memberships/coupons')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create promo or corporate code' })
  createCoupon(@Body() dto: CreateCouponDto, @CurrentUser() user: AuthUserPayload) {
    return this.couponsService.create(dto, user);
  }

  @Get('memberships/coupons')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List promo & corporate codes' })
  @ApiResponse({ status: 200, type: [CouponResponseDto] })
  listCoupons(@CurrentUser() user: AuthUserPayload, @Query() query: CouponQueryDto) {
    return this.couponsService.list(user, query);
  }

  @Put('memberships/coupons/:id')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update coupon' })
  updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.couponsService.update(id, dto, user);
  }

  @Patch('memberships/coupons/:id/deactivate')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Deactivate coupon' })
  deactivateCoupon(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.couponsService.deactivate(id, user);
  }

  @Post('memberships/purchase')
  @RequirePermissions(Permission.MEMBERSHIPS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Purchase membership with optional promo/corporate code' })
  purchase(@Body() dto: PurchaseMembershipDto, @CurrentUser() user: AuthUserPayload) {
    return this.membershipsService.purchase(dto, user.id);
  }

  @Post('memberships/validate-coupon')
  @RequirePermissions(Permission.MEMBERSHIPS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Validate promo or corporate code before checkout' })
  validateCoupon(@Body() dto: ValidateCouponDto, @CurrentUser() user: AuthUserPayload) {
    return this.membershipsService.validateCoupon(dto, user.id);
  }

  @Post('memberships/expire')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Expire past-due memberships (cron/admin)' })
  expireMemberships() {
    return this.membershipsService.expireMemberships();
  }

  @Get('memberships/admin/purchases')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MEMBERSHIPS_MANAGE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: paginated membership subscriptions' })
  adminPurchases(@Query() query: AdminListQueryDto) {
    return this.membershipsService.adminListPurchases({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status as 'ACTIVE' | 'EXPIRED' | 'ALL' | undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('memberships/my')
  @RequirePermissions(Permission.MEMBERSHIPS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'My memberships (all paid, or ?activeOnly=true)' })
  getMyMemberships(
    @CurrentUser() user: AuthUserPayload,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.membershipsService.getMyMemberships(user.id, activeOnly === 'true');
  }

  // ─── Per-membership routes ───────────────────────────────────────────────────

  @Post('memberships/:id/renew')
  @RequirePermissions(Permission.MEMBERSHIPS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Renew an existing membership' })
  renew(
    @Param('id') id: string,
    @Body() dto: RenewMembershipDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.membershipsService.renew(id, dto, user.id);
  }

  @Patch('memberships/:id/auto-renew')
  @RequirePermissions(Permission.MEMBERSHIPS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle auto-renewal' })
  setAutoRenew(
    @Param('id') id: string,
    @Body() dto: SetAutoRenewDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.membershipsService.setAutoRenew(id, dto.autoRenew, user.id);
  }

  @Get('memberships/:id/usage')
  @RequirePermissions(Permission.MEMBERSHIPS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Usage tracking — bookings used vs maxBookings limit' })
  @ApiResponse({ status: 200, type: MembershipUsageResponseDto })
  getUsage(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.membershipsService.getUsage(id, user);
  }
}
