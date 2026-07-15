import { Inject, Injectable, Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  async send(phone: string, message: string, options?: SmsSendOptions): Promise<boolean> {
    if (options?.otpCode) {
      process.stdout.write(
        [
          '====================================',
          'FITORA DEVELOPMENT OTP',
          '====================================',
          `Phone: ${formatPhoneForConsole(phone)}`,
          `OTP: ${options.otpCode}`,
          `Expires: ${options.expiresInMinutes ?? 5} minutes`,
          '====================================',
          '',
        ].join('\n'),
      );
      this.logger.log(
        `[DEV OTP] phone=${formatPhoneForConsole(phone)} code=${options.otpCode} expiresIn=${options.expiresInMinutes ?? 5}m`,
      );
      return true;
    }

    this.logger.log(`[SMS CONSOLE] ${formatPhoneForConsole(phone)} -> ${message.slice(0, 160)}`);
    return true;
  }
}

@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  private readonly logger = new Logger(Msg91SmsProvider.name);

  constructor(
    @Inject(ConfigService)
    private config: ConfigService,
  ) {}

  async send(phone: string, message: string, options?: SmsSendOptions): Promise<boolean> {
    const apiKey = this.config.get<string>('MSG91_AUTH_KEY');
    const templateId = this.config.get<string>(
      options?.otpCode ? 'MSG91_OTP_TEMPLATE_ID' : 'MSG91_NOTIFY_TEMPLATE_ID',
    );
    const sender = this.config.get('MSG91_SENDER_ID', 'FITORA');

    if (!apiKey || !templateId) {
      this.logger.warn('MSG91 SMS provider is not configured');
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
          template_id: templateId,
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

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor(
    @Inject(ConfigService)
    private config: ConfigService,
  ) {}

  async send(phone: string, message: string): Promise<boolean> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER');
    const messagingServiceSid = this.config.get<string>('TWILIO_MESSAGING_SERVICE_SID');

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      this.logger.warn('Twilio SMS provider is not configured');
      return false;
    }

    const body = new URLSearchParams({
      To: phone,
      Body: message,
    });

    if (messagingServiceSid) {
      body.set('MessagingServiceSid', messagingServiceSid);
    } else if (fromNumber) {
      body.set('From', fromNumber);
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        },
      );

      if (!res.ok) {
        this.logger.error(`Twilio error: ${res.status}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error('SMS send failed', err);
      return false;
    }
  }
}

export interface SmsSendOptions {
  otpCode?: string;
  expiresInMinutes?: number;
}

export interface SmsProvider {
  send(phone: string, message: string, options?: SmsSendOptions): Promise<boolean>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

type OtpProviderName = 'console' | 'msg91' | 'twilio';

const smsProviderSelectorLogger = new Logger('SmsProviderSelector');

export const smsProviderProviders: Provider[] = [
  ConsoleSmsProvider,
  Msg91SmsProvider,
  TwilioSmsProvider,
  {
    provide: SMS_PROVIDER,
    inject: [ConfigService, ConsoleSmsProvider, Msg91SmsProvider, TwilioSmsProvider],
    useFactory: (
      config: ConfigService,
      consoleProvider: ConsoleSmsProvider,
      msg91Provider: Msg91SmsProvider,
      twilioProvider: TwilioSmsProvider,
    ): SmsProvider => {
      const nodeEnv = config.get<string>('NODE_ENV', 'development');
      const configuredProvider =
        config.get<OtpProviderName>('OTP_PROVIDER', 'console') ?? 'console';

      if (nodeEnv === 'development') {
        if (configuredProvider !== 'console') {
          smsProviderSelectorLogger.warn(
            `OTP_PROVIDER=${configuredProvider} ignored in development; using console provider`,
          );
        }
        return consoleProvider;
      }

      switch (configuredProvider) {
        case 'msg91':
          return msg91Provider;
        case 'twilio':
          return twilioProvider;
        case 'console':
        default:
          return consoleProvider;
      }
    },
  },
];

function formatPhoneForConsole(phone: string): string {
  const match = phone.match(/^\+91(\d{10})$/);
  if (match) {
    return `+91 ${match[1]}`;
  }
  return phone;
}
