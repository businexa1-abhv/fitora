import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole } from '@fitora/types';
import { SettlementStatus } from '@prisma/client';
import { CurrentUser, type AuthUserPayload, RequirePermissions, Roles } from '../common/decorators';
import { RolesGuard } from '../common/guards/roles.guard';
import { RevenueAnalyticsService } from './analytics/revenue-analytics.service';
import { CommissionEngine } from './commission/commission.engine';
import { FinanceInvoiceService } from './invoice/finance-invoice.service';
import { LedgerService } from './ledger/ledger.service';
import { SettlementService } from './settlement/settlement.service';
import { SubscriptionService } from './subscription/subscription.service';
import { MerchantWalletService } from './wallet/merchant-wallet.service';
import { IsBoolean, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

class PurchaseSubscriptionDto {
  @IsUUID()
  planId!: string;

  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

class UpdateCommissionRuleDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  ratePercent?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  flatFee?: number | null;
}

@ApiTags('Finance')
@ApiBearerAuth()
@Controller()
export class FinanceController {
  constructor(
    private readonly subscriptions: SubscriptionService,
    private readonly commissions: CommissionEngine,
    private readonly wallets: MerchantWalletService,
    private readonly ledger: LedgerService,
    private readonly settlements: SettlementService,
    private readonly analytics: RevenueAnalyticsService,
    private readonly invoices: FinanceInvoiceService,
  ) {}

  @Get('subscriptions/plans')
  @RequirePermissions(
    Permission.FINANCE_READ,
    Permission.SUBSCRIPTIONS_MANAGE,
    Permission.PAYMENTS_READ,
  )
  listPlans() {
    return this.subscriptions.listPlans();
  }

  @Get('subscriptions/my')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @RequirePermissions(Permission.SUBSCRIPTIONS_MANAGE, Permission.FINANCE_READ)
  mySubscription(@CurrentUser() user: AuthUserPayload) {
    return this.subscriptions.getMySubscription(user.id);
  }

  @Post('subscriptions/purchase')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @RequirePermissions(Permission.SUBSCRIPTIONS_MANAGE)
  purchase(@CurrentUser() user: AuthUserPayload, @Body() body: PurchaseSubscriptionDto) {
    return this.subscriptions.purchase({
      ownerId: user.id,
      planId: body.planId,
      tenantId: body.tenantId,
      autoRenew: body.autoRenew,
    });
  }

  @Get('commission/rules')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @RequirePermissions(Permission.FINANCE_WRITE)
  listCommissionRules() {
    return this.commissions.listRules();
  }

  @Put('commission/rules/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @RequirePermissions(Permission.FINANCE_WRITE)
  updateCommissionRule(@Param('id') id: string, @Body() body: UpdateCommissionRuleDto) {
    return this.commissions.updateRule(id, body);
  }

  @Get('wallet/merchant')
  @RequirePermissions(Permission.FINANCE_READ, Permission.SETTLEMENTS_READ)
  merchantWallet(@CurrentUser() user: AuthUserPayload) {
    return this.wallets.getForUser(user.id);
  }

  @Get('ledger')
  @RequirePermissions(Permission.FINANCE_READ)
  ledgerEntries(
    @CurrentUser() user: AuthUserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const isAdmin = user.roles?.includes(UserRole.ADMIN);
    return this.ledger.listEntries({
      userId: isAdmin ? undefined : user.id,
      cursor,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('settlements')
  @RequirePermissions(Permission.SETTLEMENTS_READ, Permission.FINANCE_READ)
  listSettlements(
    @CurrentUser() user: AuthUserPayload,
    @Query('status') status?: SettlementStatus,
  ) {
    const isAdmin = user.roles?.includes(UserRole.ADMIN);
    return this.settlements.listSettlements({
      userId: user.id,
      isAdmin,
      status,
    });
  }

  @Post('settlements/process')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @RequirePermissions(Permission.SETTLEMENTS_PROCESS)
  processSettlements(@CurrentUser() user: AuthUserPayload) {
    return this.settlements.processDueSettlements(user.id);
  }

  @Post('settlements/:id/process')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @RequirePermissions(Permission.SETTLEMENTS_PROCESS)
  processOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.settlements.processSettlementById(id, user.id);
  }

  @Get('settlements/:id/invoice')
  @RequirePermissions(Permission.SETTLEMENTS_READ, Permission.FINANCE_READ)
  async settlementInvoice(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    const isAdmin = user.roles?.includes(UserRole.ADMIN);
    const settlement = await this.settlements.listSettlements({
      userId: user.id,
      isAdmin,
    });
    const match = settlement.find((s) => s.id === id);
    if (!match) return null;
    return this.invoices.getBySettlementId(id, isAdmin ? undefined : user.id);
  }

  @Get('reports/revenue')
  @RequirePermissions(Permission.FINANCE_READ)
  ownerRevenue(
    @CurrentUser() user: AuthUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.getOwnerRevenue(
      user.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('reports/platform')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @RequirePermissions(Permission.FINANCE_READ)
  platformReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.getPlatformReport(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
