import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { RequestWithId } from './request-id.middleware';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const log = {
        event: 'http_request',
        requestId: req.requestId,
        method,
        path: originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: ip ?? req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      if (res.statusCode >= 500) {
        this.logger.error(JSON.stringify(log));
      } else if (res.statusCode >= 400) {
        this.logger.warn(JSON.stringify(log));
      } else {
        this.logger.log(JSON.stringify(log));
      }
    });

    next();
  }
}
