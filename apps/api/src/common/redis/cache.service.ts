import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CACHE_PREFIX } from './cache.constants';

type MemoryEntry = { value: string; expiresAt: number };

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const client = this.redisService.getClient();
    if (client && this.redisService.isAvailable()) {
      try {
        const raw = await client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (err) {
        this.logger.warn(`Cache get failed for ${key}: ${String(err)}`);
      }
    }

    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const client = this.redisService.getClient();

    if (client && this.redisService.isAvailable()) {
      try {
        await client.setex(key, ttlSeconds, serialized);
        return;
      } catch (err) {
        this.logger.warn(`Cache set failed for ${key}: ${String(err)}`);
      }
    }

    this.memory.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    const client = this.redisService.getClient();
    if (client && this.redisService.isAvailable()) {
      try {
        await client.del(key);
      } catch {
        /* ignore */
      }
    }
    this.memory.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const client = this.redisService.getClient();
    let deleted = 0;

    if (client && this.redisService.isAvailable()) {
      try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          deleted = await client.del(...keys);
        }
      } catch (err) {
        this.logger.warn(`Cache invalidate failed for ${pattern}: ${String(err)}`);
      }
    }

    const prefix = pattern.replace(/\*/g, '');
    for (const key of [...this.memory.keys()]) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async flushNamespace(namespace: string): Promise<number> {
    return this.invalidatePattern(`${CACHE_PREFIX}${namespace}*`);
  }
}
