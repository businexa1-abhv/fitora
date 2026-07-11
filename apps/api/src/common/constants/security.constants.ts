export const GLOBAL_RATE_LIMIT_WINDOW_MS = 60_000;
export const GLOBAL_RATE_LIMIT_MAX_REQUESTS = 100;

export const CSRF_EXCLUDED_PATHS = [
  '/api/v1/health',
  '/api/v1/health/ready',
  '/api/v1/payments/webhook',
  '/api/docs',
];

export const AUDIT_EXCLUDED_PATHS = ['/api/v1/health', '/api/v1/health/ready'];
