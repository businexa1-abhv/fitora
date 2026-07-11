import { validateEnv } from './validate-env';

describe('validateEnv', () => {
  const baseEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/fitora',
    JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars',
    PAYMENT_MODE: 'mock',
    OTP_MODE: 'mock',
    EMAIL_MODE: 'mock',
    SMS_MODE: 'mock',
    PUSH_MODE: 'mock',
    NODE_ENV: 'development',
  };

  it('accepts valid development config', () => {
    const result = validateEnv(baseEnv);
    expect(result.DATABASE_URL).toBe(baseEnv.DATABASE_URL);
    expect(result.SWAGGER_ENABLED).toBe(false);
  });

  it('rejects short JWT secret in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'too-short',
        REDIS_URL: 'redis://localhost:6379',
        SWAGGER_ENABLED: 'false',
        OTP_MODE: 'live',
        EMAIL_MODE: 'live',
        SMS_MODE: 'live',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('requires webhook secret for live payments', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        PAYMENT_MODE: 'live',
        RAZORPAY_KEY_ID: 'rzp_live_xxx',
        RAZORPAY_KEY_SECRET: 'secret',
      }),
    ).toThrow(/RAZORPAY_WEBHOOK_SECRET/);
  });
});
