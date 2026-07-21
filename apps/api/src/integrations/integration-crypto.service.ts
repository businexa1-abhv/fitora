import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IntegrationCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const configured = config.get<string>('INTEGRATION_ENCRYPTION_KEY');
    if (!configured && config.get<string>('NODE_ENV') === 'production') {
      throw new Error('INTEGRATION_ENCRYPTION_KEY is required in production');
    }
    // Stable development-only fallback; never used in production.
    this.key = configured
      ? this.parseKey(configured)
      : createHash('sha256').update('fitora-development-integration-key').digest();
  }

  hashApiKey(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  encrypt(value: unknown): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
  }

  decrypt<T>(encrypted: string): T {
    const [version, iv, tag, ciphertext] = encrypted.split('.');
    if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid encrypted value');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64url')),
        decipher.final(),
      ]).toString('utf8'),
    ) as T;
  }

  private parseKey(value: string): Buffer {
    const key = /^[a-f\d]{64}$/i.test(value)
      ? Buffer.from(value, 'hex')
      : Buffer.from(value, 'base64');
    if (key.length !== 32) {
      throw new Error('INTEGRATION_ENCRYPTION_KEY must be 32 bytes (base64 or 64 hex chars)');
    }
    return key;
  }
}
