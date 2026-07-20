import { Module, forwardRef } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { PaymentsModule } from '../payments/payments.module';
import { CouponsService } from './coupons.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [forwardRef(() => PaymentsModule), forwardRef(() => FinanceModule)],
  controllers: [MembershipsController],
  providers: [MembershipsService, CouponsService],
  exports: [MembershipsService, CouponsService],
})
export class MembershipsModule {}
