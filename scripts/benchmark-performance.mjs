#!/usr/bin/env node
/**
 * FitOra API performance benchmark — measures endpoint latency and payload size.
 *
 * Usage:
 *   node scripts/benchmark-performance.mjs [--base-url=http://localhost:3001] [--runs=20]
 *   node scripts/benchmark-performance.mjs --compare=scripts/benchmark-baseline.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);

const BASE_URL = (args['base-url'] ?? process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const RUNS = Number(args.runs ?? 15);
const COMPARE_FILE = args.compare;

const ENDPOINTS = [
  { name: 'health_liveness', path: '/api/v1/health', auth: false },
  { name: 'health_readiness', path: '/api/v1/health/ready', auth: false },
  { name: 'sports_list', path: '/api/v1/sports', auth: false },
  { name: 'shop_categories', path: '/api/v1/shop/categories', auth: false },
  { name: 'shop_products', path: '/api/v1/shop/products?page=1&pageSize=20', auth: false },
  { name: 'shop_products_cursor', path: '/api/v1/shop/products/cursor?limit=20', auth: false },
  { name: 'courts_list', path: '/api/v1/courts?page=1&pageSize=20', auth: false },
  { name: 'metrics_json', path: '/api/v1/metrics/json', auth: false },
];

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function measureEndpoint(endpoint) {
  const durations = [];
  let payloadBytes = 0;
  let compressedBytes = 0;
  let cacheStatus = null;
  let errors = 0;

  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${endpoint.path}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          ...(endpoint.auth ? { Authorization: `Bearer ${process.env.BENCHMARK_TOKEN ?? ''}` } : {}),
        },
      });
      const buf = await res.arrayBuffer();
      const duration = performance.now() - start;
      durations.push(duration);
      payloadBytes = buf.byteLength;
      compressedBytes = Number(res.headers.get('content-length') ?? buf.byteLength);
      cacheStatus = res.headers.get('x-cache') ?? res.headers.get('age');
      if (!res.ok) errors++;
    } catch {
      errors++;
      durations.push(performance.now() - start);
    }
  }

  const sorted = [...durations].sort((a, b) => a - b);
  return {
    name: endpoint.name,
    path: endpoint.path,
    runs: RUNS,
    errors,
    latencyMs: {
      min: Math.round(sorted[0] ?? 0),
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1)),
      p50: Math.round(percentile(sorted, 50)),
      p95: Math.round(percentile(sorted, 95)),
      max: Math.round(sorted[sorted.length - 1] ?? 0),
    },
    payloadBytes,
    compressedBytes,
    cacheStatus,
  };
}

async function main() {
  console.log(`\nFitOra Performance Benchmark`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Runs per endpoint: ${RUNS}\n`);

  const results = [];
  for (const endpoint of ENDPOINTS) {
    process.stdout.write(`  ${endpoint.name}...`);
    const result = await measureEndpoint(endpoint);
    results.push(result);
    console.log(` p50=${result.latencyMs.p50}ms`);
  }

  const report = {
    label: 'after',
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    runs: RUNS,
    endpoints: results,
    summary: {
      avgP50: Math.round(results.reduce((s, r) => s + r.latencyMs.p50, 0) / results.length),
      avgP95: Math.round(results.reduce((s, r) => s + r.latencyMs.p95, 0) / results.length),
      totalErrors: results.reduce((s, r) => s + r.errors, 0),
    },
  };

  const outPath = join(__dirname, 'benchmark-after.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nResults written to ${outPath}`);

  const baselinePath = COMPARE_FILE ?? join(__dirname, 'benchmark-baseline.json');
  if (existsSync(baselinePath)) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    console.log('\n── Before vs After ──\n');
    console.log(
      '| Endpoint | Before p50 | After p50 | Change | Before p95 | After p95 | Change |',
    );
    console.log('|----------|------------|-----------|--------|------------|-----------|--------|');

    for (const after of results) {
      const before = baseline.endpoints?.find((e) => e.name === after.name);
      if (!before) continue;
      const p50Change = pctChange(before.latencyMs.p50, after.latencyMs.p50);
      const p95Change = pctChange(before.latencyMs.p95, after.latencyMs.p95);
      console.log(
        `| ${after.name} | ${before.latencyMs.p50}ms | ${after.latencyMs.p50}ms | ${p50Change} | ${before.latencyMs.p95}ms | ${after.latencyMs.p95}ms | ${p95Change} |`,
      );
    }

    if (baseline.summary && report.summary) {
      console.log(
        `\nOverall avg p50: ${baseline.summary.avgP50}ms → ${report.summary.avgP50}ms (${pctChange(baseline.summary.avgP50, report.summary.avgP50)})`,
      );
      console.log(
        `Overall avg p95: ${baseline.summary.avgP95}ms → ${report.summary.avgP95}ms (${pctChange(baseline.summary.avgP95, report.summary.avgP95)})`,
      );
    }
  } else {
    console.log(`\nNo baseline at ${baselinePath} — create benchmark-baseline.json for comparisons.`);
  }
}

function pctChange(before, after) {
  if (!before) return 'n/a';
  const pct = Math.round(((before - after) / before) * 100);
  return pct >= 0 ? `-${pct}%` : `+${Math.abs(pct)}%`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
