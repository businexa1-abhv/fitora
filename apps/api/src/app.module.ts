import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/validate-env';
import { CoreModule } from './common/core.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { CourtsModule } from './courts/courts.module';
import { SlotsModule } from './slots/slots.module';
import { PaymentsModule } from './payments/payments.module';
import { MembershipsModule } from './memberships/memberships.module';
import { TrainingModule } from './training/training.module';
import { ShopModule } from './shop/shop.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TrainersModule } from './trainers/trainers.module';
import { PrintModule } from './print/print.module';
import { ServicesModule } from './services/services.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WalletModule } from './wallet/wallet.module';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';
import { TenantsModule } from './tenants/tenants.module';
import { PartnerOnboardingModule } from './partner-onboarding/partner-onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CoreModule,
    QueueModule,
    PrismaModule,
    TenantsModule,
    PartnerOnboardingModule,
    AuthModule,
    UsersModule,
    HealthModule,
    PaymentsModule,
    MembershipsModule,
    TrainingModule,
    TrainersModule,
    ShopModule,
    PrintModule,
    ServicesModule,
    AnalyticsModule,
    BookingsModule,
    NotificationsModule,
    CourtsModule,
    SlotsModule,
    WalletModule,
    AiModule,
  ],
})
export class AppModule {}
