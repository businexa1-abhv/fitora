declare module '@sentry/nestjs' {
  export function init(options: Record<string, unknown>): void;
}

declare module '@sentry/profiling-node' {
  export function nodeProfilingIntegration(): unknown;
}
