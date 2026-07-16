import { z } from 'zod';

const modeSchema = z.enum(['mock', 'live']).default('mock');
const otpProviderSchema = z.enum(['console', 'msg91', 'twilio']).default('console');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().optional(),
    CDN_BASE_URL: z.string().url().optional(),
    CACHE_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),

    JWT_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    CORS_ORIGINS: z
      .string()
      .default(
        'http://localhost:3000,http://localhost:3002,http://localhost:3010,http://localhost:3011,http://localhost:3012',
      ),
    FRONTEND_URL: z.string().url().optional(),

    PAYMENT_MODE: modeSchema,
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    OTP_PROVIDER: otpProviderSchema,
    EMAIL_MODE: modeSchema,
    PUSH_MODE: modeSchema,
    AI_MODE: modeSchema,
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_MAX_TOKENS: z.coerce.number().int().positive().default(2048),

    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_OTP_TEMPLATE_ID: z.string().optional(),
    MSG91_SENDER_ID: z.string().optional(),
    MSG91_NOTIFY_TEMPLATE_ID: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM_NUMBER: z.string().optional(),
    TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),

    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

    GOOGLE_CLIENT_ID: z.string().optional(),

    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    GLOBAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

    AVAILABILITY_ENGINE_V2: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    BOOKING_LOCK_TTL_MINUTES: z.coerce.number().int().positive().optional(),

    RUN_MIGRATIONS: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
  })
  .superRefine((env, ctx) => {
    const isProd = env.NODE_ENV === 'production';

    if (isProd) {
      if (env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 32 characters in production',
        });
      }
      if (env.JWT_REFRESH_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET must be at least 32 characters in production',
        });
      }
      if (env.SWAGGER_ENABLED) {
        ctx.addIssue({
          code: 'custom',
          path: ['SWAGGER_ENABLED'],
          message: 'SWAGGER_ENABLED must be false in production',
        });
      }
      if (env.OTP_PROVIDER === 'console') {
        ctx.addIssue({
          code: 'custom',
          path: ['OTP_PROVIDER'],
          message: 'Console OTP provider is not allowed in production',
        });
      }
      if (env.EMAIL_MODE === 'mock' || env.PUSH_MODE === 'mock') {
        ctx.addIssue({
          code: 'custom',
          path: ['EMAIL_MODE'],
          message: 'Mock notification modes are not allowed in production',
        });
      }
      if (!env.REDIS_URL) {
        ctx.addIssue({
          code: 'custom',
          path: ['REDIS_URL'],
          message: 'REDIS_URL is required in production',
        });
      }
    }

    if (env.PAYMENT_MODE === 'live' || (isProd && env.RAZORPAY_KEY_ID)) {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['RAZORPAY_KEY_ID'],
          message: 'Razorpay keys are required when payments are live',
        });
      }
      if (!env.RAZORPAY_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['RAZORPAY_WEBHOOK_SECRET'],
          message: 'RAZORPAY_WEBHOOK_SECRET is required for live payments',
        });
      }
    }

    if (env.AI_MODE === 'live' || (isProd && env.OPENAI_API_KEY)) {
      if (!env.OPENAI_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['OPENAI_API_KEY'],
          message: 'OPENAI_API_KEY is required when AI_MODE is live',
        });
      }
    }

    if (isProd && env.OTP_PROVIDER === 'msg91') {
      if (!env.MSG91_AUTH_KEY || !env.MSG91_OTP_TEMPLATE_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['MSG91_AUTH_KEY'],
          message: 'MSG91 credentials and OTP template are required when OTP_PROVIDER=msg91',
        });
      }
    }

    if (isProd && env.OTP_PROVIDER === 'twilio') {
      if (
        !env.TWILIO_ACCOUNT_SID ||
        !env.TWILIO_AUTH_TOKEN ||
        (!env.TWILIO_FROM_NUMBER && !env.TWILIO_MESSAGING_SERVICE_SID)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['TWILIO_ACCOUNT_SID'],
          message: 'Twilio credentials and sender are required when OTP_PROVIDER=twilio',
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;
