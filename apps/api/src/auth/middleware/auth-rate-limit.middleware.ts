import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RateLimitService } from '../../common/redis/rate-limit.service';
import {
  AUTH_RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_WINDOW_MS,
} from '../constants/auth.constants';
import { RequestWithId } from '../../common/middleware/request-id.middleware';

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  constructor(private rateLimitService: RateLimitService) {}

  async use(req: RequestWithId, _res: Response, next: NextFunction): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `auth:${ip}:${req.path}`;

    const { allowed } = await this.rateLimitService.consume(
      key,
      AUTH_RATE_LIMIT_MAX_REQUESTS,
      AUTH_RATE_LIMIT_WINDOW_MS,
    );

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many auth requests. Please try again later.',
          requestId: req.requestId,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
