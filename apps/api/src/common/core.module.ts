import { Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogService } from './audit/audit-log.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import {
  CsrfProtectionMiddleware,
  GlobalRateLimitMiddleware,
} from './middleware/security.middleware';
import { MetricsModule } from './metrics/metrics.module';
import { CacheService } from './redis/cache.service';
import { RateLimitService } from './redis/rate-limit.service';
import { RedisService } from './redis/redis.service';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [
    RedisService,
    CacheService,
    RateLimitService,
    AuditLogService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: PerformanceInterceptor },
  ],
  exports: [RedisService, CacheService, RateLimitService, AuditLogService],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        RequestIdMiddleware,
        RequestLoggingMiddleware,
        CsrfProtectionMiddleware,
        GlobalRateLimitMiddleware,
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
