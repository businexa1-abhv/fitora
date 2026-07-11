process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://fitora:fitora@localhost:5440/fitora_test?schema=public';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-minimum-32-chars';
process.env.PAYMENT_MODE = process.env.PAYMENT_MODE ?? 'mock';
process.env.OTP_MODE = process.env.OTP_MODE ?? 'mock';
process.env.EMAIL_MODE = process.env.EMAIL_MODE ?? 'mock';
process.env.SMS_MODE = process.env.SMS_MODE ?? 'mock';
process.env.PUSH_MODE = process.env.PUSH_MODE ?? 'mock';
process.env.SWAGGER_ENABLED = process.env.SWAGGER_ENABLED ?? 'false';
process.env.CORS_ORIGINS =
  process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002';
