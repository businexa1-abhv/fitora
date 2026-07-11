import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  constructor(private config: ConfigService) {}

  async send(phone: string, message: string): Promise<boolean> {
    const mode = this.config.get('SMS_MODE', 'mock');
    if (mode === 'mock') {
      this.logger.log(`[SMS MOCK] ${phone} → ${message.slice(0, 160)}`);
      return true;
    }

    const apiKey = this.config.get('MSG91_AUTH_KEY');
    const sender = this.config.get('MSG91_SENDER_ID', 'FITORA');

    if (!apiKey) {
      this.logger.warn('MSG91_AUTH_KEY not set — SMS mock fallback');
      this.logger.log(`[SMS MOCK] ${phone} → ${message.slice(0, 160)}`);
      return false;
    }

    try {
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          authkey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: this.config.get('MSG91_NOTIFY_TEMPLATE_ID'),
          short_url: '0',
          recipients: [{ mobiles: phone.replace('+', ''), message }],
          sender,
        }),
      });
      if (!res.ok) {
        this.logger.error(`MSG91 error: ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error('SMS send failed', err);
      return false;
    }
  }
}
