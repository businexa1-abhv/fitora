import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminPartnerApplicationsController } from './admin-partner-applications.controller';
import { PartnerOnboardingController } from './partner-onboarding.controller';
import { PartnerOnboardingService } from './partner-onboarding.service';

@Module({
  imports: [AuthModule],
  controllers: [PartnerOnboardingController, AdminPartnerApplicationsController],
  providers: [PartnerOnboardingService],
  exports: [PartnerOnboardingService],
})
export class PartnerOnboardingModule {}
