import { Injectable } from '@nestjs/common';

type HistogramBucket = { le: number; count: number };

@Injectable()
export class MetricsService {
  private requestCount = 0;
  private errorCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly durations: number[] = [];
  private readonly maxSamples = 10_000;

  recordRequest(durationMs: number, statusCode: number) {
    this.requestCount++;
    if (statusCode >= 500) this.errorCount++;
    this.durations.push(durationMs);
    if (this.durations.length > this.maxSamples) {
      this.durations.shift();
    }
  }

  recordCacheHit() {
    this.cacheHits++;
  }

  recordCacheMiss() {
    this.cacheMisses++;
  }

  getSnapshot() {
    const sorted = [...this.durations].sort((a, b) => a - b);
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const p99 = percentile(sorted, 99);
    const avg =
      sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;

    return {
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      },
      latencyMs: { avg: round(avg), p50: round(p50), p95: round(p95), p99: round(p99) },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate:
          this.cacheHits + this.cacheMisses > 0
            ? this.cacheHits / (this.cacheHits + this.cacheMisses)
            : 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  toPrometheus(): string {
    const snap = this.getSnapshot();
    const buckets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    const histogram = buildHistogram(this.durations, buckets);

    const lines = [
      '# HELP fitora_http_requests_total Total HTTP requests',
      '# TYPE fitora_http_requests_total counter',
      `fitora_http_requests_total ${snap.requests.total}`,
      '# HELP fitora_http_errors_total Total HTTP 5xx responses',
      '# TYPE fitora_http_errors_total counter',
      `fitora_http_errors_total ${snap.requests.errors}`,
      '# HELP fitora_cache_hits_total Cache hits',
      '# TYPE fitora_cache_hits_total counter',
      `fitora_cache_hits_total ${snap.cache.hits}`,
      '# HELP fitora_cache_misses_total Cache misses',
      '# TYPE fitora_cache_misses_total counter',
      `fitora_cache_misses_total ${snap.cache.misses}`,
      '# HELP fitora_http_request_duration_ms Request duration histogram',
      '# TYPE fitora_http_request_duration_ms histogram',
    ];

    for (const bucket of histogram) {
      lines.push(`fitora_http_request_duration_ms_bucket{le="${bucket.le}"} ${bucket.count}`);
    }
    lines.push(`fitora_http_request_duration_ms_bucket{le="+Inf"} ${this.durations.length}`);
    lines.push(`fitora_http_request_duration_ms_count ${this.durations.length}`);

    const sum = this.durations.reduce((a, b) => a + b, 0);
    lines.push(`fitora_http_request_duration_ms_sum ${round(sum)}`);

    return lines.join('\n') + '\n';
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildHistogram(values: number[], buckets: number[]): HistogramBucket[] {
  return buckets.map((le) => ({
    le,
    count: values.filter((v) => v <= le).length,
  }));
}
