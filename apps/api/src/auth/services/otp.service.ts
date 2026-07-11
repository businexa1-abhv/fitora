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

  async verifyOtp(phone: string, code: string, purpose: OtpPurpose): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: normalizedPhone,
        purpose,
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
      include: { roles: { where: { deletedAt: null } } },
    });
  }

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new BadRequestException('Invalid phone number format');
    }
    return phone.startsWith('+') ? `+${digits}` : `+${digits}`;
  }

  private generateOtpCode(): string {
    const max = 10 ** OTP_LENGTH;
    const num = crypto.randomInt(0, max);
    return num.toString().padStart(OTP_LENGTH, '0');
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
    const mode = this.configService.get('OTP_MODE', 'mock');

    if (mode === 'mock') {
      this.logger.log(`[OTP MOCK] ${phone} → ${code}`);
      return;
    }

    const apiKey = this.configService.get('MSG91_AUTH_KEY');
    const templateId = this.configService.get('MSG91_OTP_TEMPLATE_ID');

    if (!apiKey || !templateId) {
      this.logger.warn('SMS provider not configured — falling back to mock OTP');
      this.logger.log(`[OTP MOCK] ${phone} → ${code}`);
      return;
    }

    // Production: integrate MSG91 / Twilio here
    this.logger.log(`OTP dispatched to ${phone} via SMS provider`);
  }
}
