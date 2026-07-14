import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import {
  BCRYPT_ROUNDS,
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_HOUR,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../constants/auth.constants';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async sendOtp(phone: string, purpose: OtpPurpose): Promise<{ message: string; expiresIn: number }> {
    const normalizedPhone = this.normalizePhone(phone);

    await this.assertHourlyRateLimit(normalizedPhone);
    await this.assertResendCooldown(normalizedPhone, purpose);
    await this.invalidatePendingOtps(normalizedPhone, purpose);

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: {
        phone: normalizedPhone,
        codeHash,
        purpose,
        expiresAt,
      },
    });

    await this.dispatchOtp(normalizedPhone, code);

    return {
      message: 'OTP sent successfully',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    };
  }

  async verifyOtp(phone: string, code: string, purpose?: OtpPurpose): Promise<OtpPurpose> {
    const normalizedPhone = this.normalizePhone(phone);
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: normalizedPhone,
        ...(purpose ? { purpose } : {}),
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new HttpException('Maximum OTP attempts exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    const valid = await bcrypt.compare(code, record.codeHash);

    if (!valid) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    return record.purpose;
  }

  async assertPhoneAvailable(phone: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { phone: this.normalizePhone(phone), deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }
  }

  async findUserByPhone(phone: string) {
    return this.prisma.user.findFirst({
      where: { phone: this.normalizePhone(phone), deletedAt: null, isActive: true },
      include: {
        roles: { where: { deletedAt: null } },
        playerProfile: { where: { deletedAt: null } },
      },
    });
  }

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new BadRequestException('Invalid phone number format');
    }
    // India default: 10-digit local → +91
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    return `+${digits}`;
  }

  private generateOtpCode(): string {
    const max = 10 ** OTP_LENGTH;
    const num = crypto.randomInt(0, max);
    return num.toString().padStart(OTP_LENGTH, '0');
  }

  private async assertHourlyRateLimit(phone: string): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.otpVerification.count({
      where: { phone, createdAt: { gte: since } },
    });

    if (count >= OTP_MAX_REQUESTS_PER_HOUR) {
      throw new HttpException(
        'Too many OTP requests. Please try again in an hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async assertResendCooldown(phone: string, purpose: OtpPurpose): Promise<void> {
    const recent = await this.prisma.otpVerification.findFirst({
      where: { phone, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
        throw new HttpException(
          `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed)} seconds before requesting a new OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  private async invalidatePendingOtps(phone: string, purpose: OtpPurpose): Promise<void> {
    await this.prisma.otpVerification.updateMany({
      where: { phone, purpose, verifiedAt: null },
      data: { verifiedAt: new Date() },
    });
  }

  private async dispatchOtp(phone: string, code: string): Promise<void> {
    const mode = this.configService.get<string>('OTP_MODE', 'mock');

    if (mode === 'mock') {
      this.logger.log(`[OTP MOCK] ${phone} → ${code}`);
      return;
    }

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');
    const messagingServiceSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID');

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      this.logger.warn('Twilio not configured — falling back to mock OTP');
      this.logger.log(`[OTP MOCK] ${phone} → ${code}`);
      return;
    }

    const body = new URLSearchParams({
      To: phone,
      Body: `Your FitOra verification code is ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    });
    if (messagingServiceSid) {
      body.set('MessagingServiceSid', messagingServiceSid);
    } else if (fromNumber) {
      body.set('From', fromNumber);
    }

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Twilio OTP dispatch failed: ${errorText}`);
      throw new HttpException('Failed to send OTP. Please try again.', HttpStatus.BAD_GATEWAY);
    }

    this.logger.log(`OTP dispatched to ${phone} via Twilio`);
  }
}
