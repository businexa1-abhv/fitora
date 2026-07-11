import { createHash } from 'crypto';

/** SHA-256 hash for storing refresh tokens (never store raw tokens). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
