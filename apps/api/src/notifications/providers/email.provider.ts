import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  constructor(private config: ConfigService) {}

  async send(to: string, subject: string, body: string): Promise<boolean> {
    const mode = this.config.get('EMAIL_MODE', 'mock');
    if (mode === 'mock') {
      this.logger.log(`[EMAIL MOCK] To: ${to} | ${subject} | ${body.slice(0, 120)}…`);
      return true;
    }

    const apiKey = this.config.get('SENDGRID_API_KEY');
    const from = this.config.get('EMAIL_FROM', 'noreply@fitora.com');

    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY not set — email mock fallback');
      this.logger.log(`[EMAIL MOCK] To: ${to} | ${subject}`);
      return false;
    }

    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from, name: 'Fitora' },
          subject,
          content: [{ type: 'text/plain', value: body }],
        }),
      });
      if (!res.ok) {
        this.logger.error(`SendGrid error: ${res.status} ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error('Email send failed', err);
      return false;
    }
  }
}
