import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = performance.now();
    const res = context.switchToHttp().getResponse<{ statusCode: number; setHeader: (k: string, v: string) => void }>();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = performance.now() - start;
          this.metricsService.recordRequest(durationMs, res.statusCode ?? 200);
          res.setHeader('X-Response-Time', `${Math.round(durationMs)}ms`);
          res.setHeader('Server-Timing', `app;dur=${Math.round(durationMs)}`);
        },
        error: () => {
          const durationMs = performance.now() - start;
          this.metricsService.recordRequest(durationMs, 500);
          res.setHeader('X-Response-Time', `${Math.round(durationMs)}ms`);
        },
      }),
    );
  }
}
