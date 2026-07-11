import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryFallback = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (!url) {
      if (nodeEnv === 'production') {
        throw new Error('REDIS_URL is required in production');
      }
      this.memoryFallback = true;
      this.logger.warn('REDIS_URL not set — using in-memory fallback (development only)');
      return;
    }

    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      await this.client.connect();
      this.logger.log('Redis connected');
    } catch (error) {
      if (nodeEnv === 'production') {
        throw error;
      }
      this.memoryFallback = true;
      this.logger.warn(`Redis unavailable (${String(error)}) — using in-memory fallback`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  usesMemoryFallback(): boolean {
    return this.memoryFallback;
  }

  getClient(): Redis | null {
    return this.client;
  }
}
