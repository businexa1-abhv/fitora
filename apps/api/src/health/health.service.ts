import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  liveness() {
    return {
      status: 'ok',
      service: 'fitora-api',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const checks: Record<string, 'ok' | 'error' | 'degraded'> = {
      database: 'error',
      redis: 'degraded',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    if (this.redisService.isAvailable()) {
      checks.redis = 'ok';
    } else if (this.redisService.usesMemoryFallback()) {
      checks.redis = 'degraded';
    } else {
      checks.redis = 'error';
    }

    const healthy = checks.database === 'ok' && checks.redis !== 'error';

    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'fitora-api',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
