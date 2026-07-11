/**
 * Optional Sentry initialization — set SENTRY_DSN to enable.
 * Install: pnpm --filter @fitora/api add @sentry/nestjs @sentry/profiling-node
 */
export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const Sentry = await import('@sentry/nestjs');
    const { nodeProfilingIntegration } = await import('@sentry/profiling-node');

    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'production',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1'),
      integrations: [nodeProfilingIntegration()],
    });
  } catch {
    console.warn('[sentry] SENTRY_DSN set but @sentry/nestjs not installed — skipping');
  }
}
