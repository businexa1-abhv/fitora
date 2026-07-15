import { UserRole } from '@prisma/client';

export const REGISTERABLE_ROLES: UserRole[] = [
  UserRole.PLAYER,
  UserRole.COURT_OWNER,
  UserRole.TRAINER,
  UserRole.SERVICE_PROVIDER,
  UserRole.PRINTER,
];

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_MAX_REQUESTS_PER_HOUR = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

export const PASSWORD_RESET_EXPIRY_HOURS = 1;
export const BCRYPT_ROUNDS = 12;

export const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;
