import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AuditService } from './services/audit.service';
import { AuthRateLimitMiddleware } from './middleware/auth-rate-limit.middleware';
import { smsProviderProviders } from '../notifications/providers/sms.provider';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpService,
    PasswordService,
    GoogleAuthService,
    AuditService,
    ...smsProviderProviders,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, TokenService, OtpService, PasswordService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/login/phone', method: RequestMethod.POST },
        { path: 'auth/login/google', method: RequestMethod.POST },
        { path: 'auth/otp/send', method: RequestMethod.POST },
        { path: 'auth/otp/verify', method: RequestMethod.POST },
        { path: 'auth/send-otp', method: RequestMethod.POST },
        { path: 'auth/verify-otp', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/refresh-token', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'auth/logout-all', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/register/otp', method: RequestMethod.POST },
      );
  }
}
