import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

interface MemoryEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly memoryStore = new Map<string, MemoryEntry>();

  constructor(private redisService: RedisService) {}

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const client = this.redisService.getClient();

    if (client && this.redisService.isAvailable()) {
      return this.consumeRedis(client, key, limit, windowMs);
    }

    return this.consumeMemory(key, limit, windowMs);
  }

  private async consumeRedis(
    client: import('ioredis').default,
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const redisKey = `rl:${key}`;
    const windowSec = Math.ceil(windowMs / 1000);

    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.expire(redisKey, windowSec);
    }

    const allowed = count <= limit;
    return { allowed, remaining: Math.max(0, limit - count) };
  }

  private consumeMemory(
    key: string,
    limit: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = this.memoryStore.get(key);

    if (!entry || now > entry.resetAt) {
      this.memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1 };
    }

    entry.count += 1;
    const allowed = entry.count <= limit;
    return { allowed, remaining: Math.max(0, limit - entry.count) };
  }
}
