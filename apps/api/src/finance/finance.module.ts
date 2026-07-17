import { Module, forwardRef } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { RevenueAnalyticsService } from './analytics/revenue-analytics.service';
import { CommissionEngine } from './commission/commission.engine';
import { FinanceController } from './finance.controller';
import { FinanceInvoiceService } from './invoice/finance-invoice.service';
import { LedgerService } from './ledger/ledger.service';
import { RevenueOrchestrator } from './revenue.orchestrator';
import { SettlementService } from './settlement/settlement.service';
import { SubscriptionService } from './subscription/subscription.service';
import { MerchantWalletService } from './wallet/merchant-wallet.service';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [FinanceController],
  providers: [
    LedgerService,
    MerchantWalletService,
    CommissionEngine,
    FinanceInvoiceService,
    SubscriptionService,
    SettlementService,
    RevenueAnalyticsService,
    RevenueOrchestrator,
  ],
  exports: [
    LedgerService,
    MerchantWalletService,
    CommissionEngine,
    SubscriptionService,
    SettlementService,
    RevenueAnalyticsService,
    RevenueOrchestrator,
    FinanceInvoiceService,
  ],
})
export class FinanceModule {}
