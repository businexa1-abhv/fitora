import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { CSRF_EXCLUDED_PATHS } from '../constants/security.constants';
import { RateLimitService } from '../redis/rate-limit.service';
import { RequestWithId } from './request-id.middleware';

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(
    private rateLimitService: RateLimitService,
    private configService: ConfigService,
  ) {}

  async use(req: RequestWithId, _res: Response, next: NextFunction): Promise<void> {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const limit = this.configService.get<number>('GLOBAL_RATE_LIMIT_MAX', 100);
    const windowMs = this.configService.get<number>('GLOBAL_RATE_LIMIT_WINDOW_MS', 60_000);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `global:${ip}`;

    const { allowed, remaining } = await this.rateLimitService.consume(key, limit, windowMs);

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          requestId: req.requestId,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    _res.setHeader('X-RateLimit-Remaining', String(remaining));
    next();
  }
}

@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: RequestWithId, _res: Response, next: NextFunction): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv !== 'production') {
      next();
      return;
    }

    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      next();
      return;
    }

    const path = req.originalUrl.split('?')[0];
    if (CSRF_EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded))) {
      next();
      return;
    }

    const allowedOrigins = (this.configService.get<string>('CORS_ORIGINS') ?? '')
      .split(',')
      .map((o: string) => o.trim())
      .filter(Boolean);

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        throw new ForbiddenException({
          message: 'Cross-origin request blocked',
          requestId: req.requestId,
        });
      }
      next();
      return;
    }

    if (referer) {
      const refererOrigin = this.extractOrigin(referer);
      if (refererOrigin && !allowedOrigins.includes(refererOrigin)) {
        throw new ForbiddenException({
          message: 'Cross-origin request blocked',
          requestId: req.requestId,
        });
      }
      next();
      return;
    }

    // Non-browser clients (mobile, server-to-server) must use Bearer auth
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ForbiddenException({
        message: 'Origin verification required for unauthenticated requests',
        requestId: req.requestId,
      });
    }

    next();
  }

  private extractOrigin(referer: string): string | null {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
}
