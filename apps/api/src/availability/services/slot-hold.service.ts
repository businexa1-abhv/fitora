import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { holdKey, slotHoldsKey, userHoldsKey } from '../constants/redis-keys';

export type HoldPayload = {
  slotId: string;
  holdToken: string;
  userId: string;
  bookingId: string;
  seats: number;
  expiresAt: Date;
};

@Injectable()
export class SlotHoldService {
  private readonly logger = new Logger(SlotHoldService.name);
  private readonly memory = new Map<string, HoldPayload>();

  constructor(private readonly redis: RedisService) {}

  async setHold(payload: HoldPayload) {
    const ttlSec = Math.max(1, Math.ceil((payload.expiresAt.getTime() - Date.now()) / 1000));
    const client = this.redis.getClient();
    if (!client || !this.redis.isAvailable()) {
      this.memory.set(holdKey(payload.slotId, payload.holdToken), payload);
      return;
    }

    try {
      const key = holdKey(payload.slotId, payload.holdToken);
      const pipe = client.multi();
      pipe.set(key, JSON.stringify(payload), 'EX', ttlSec);
      pipe.zadd(slotHoldsKey(payload.slotId), payload.expiresAt.getTime(), payload.holdToken);
      pipe.sadd(userHoldsKey(payload.userId), payload.holdToken);
      pipe.expire(userHoldsKey(payload.userId), ttlSec);
      await pipe.exec();
    } catch (error) {
      this.logger.warn(`Redis hold set failed: ${String(error)}`);
      this.memory.set(holdKey(payload.slotId, payload.holdToken), payload);
    }
  }

  async clearHold(slotId: string, holdToken: string, userId: string) {
    const client = this.redis.getClient();
    this.memory.delete(holdKey(slotId, holdToken));
    if (!client || !this.redis.isAvailable()) return;

    try {
      const pipe = client.multi();
      pipe.del(holdKey(slotId, holdToken));
      pipe.zrem(slotHoldsKey(slotId), holdToken);
      pipe.srem(userHoldsKey(userId), holdToken);
      await pipe.exec();
    } catch (error) {
      this.logger.warn(`Redis hold clear failed: ${String(error)}`);
    }
  }
}
