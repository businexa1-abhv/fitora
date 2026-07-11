import { Module, forwardRef } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { CouponsService } from './coupons.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [MembershipsController],
  providers: [MembershipsService, CouponsService],
  exports: [MembershipsService, CouponsService],
})
export class MembershipsModule {}
