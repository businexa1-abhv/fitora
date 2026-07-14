import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { type OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { type CacheService } from '../../common/redis/cache.service';
import { type RateLimitService } from '../../common/redis/rate-limit.service';
import { type SmsProvider } from '../../notifications/providers/sms.provider';
import { type PrismaService } from '../../prisma/prisma.module';
import {
  BCRYPT_ROUNDS,
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_HOUR,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../constants/auth.constants';

interface OtpCacheEntry {
  codeHash: string;
  attempts: number;
  expiresAt: string;
  phone: string;
  purpose: OtpPurpose;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private rateLimitService: RateLimitService,
    private smsProvider: SmsProvider,
  ) {}

  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<{ message: string; expiresIn: number }> {
    const normalizedPhone = this.normalizePhone(phone);

    await this.assertHourlyOtpLimit(normalizedPhone, purpose);
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

    await this.cacheService.set(
      this.otpKey(normalizedPhone, purpose),
      {
        codeHash,
        attempts: 0,
        expiresAt: expiresAt.toISOString(),
        phone: normalizedPhone,
        purpose,
      },
      OTP_EXPIRY_MINUTES * 60,
    );
    await this.cacheService.set(
      this.cooldownKey(normalizedPhone, purpose),
      true,
      OTP_RESEND_COOLDOWN_SECONDS,
    );

    await this.dispatchOtp(normalizedPhone, code);

    return {
      message: 'OTP sent successfully',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    };
  }

  async verifyOtp(phone: string, code: string, purpose: OtpPurpose): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const key = this.otpKey(normalizedPhone, purpose);
    const record = await this.cacheService.get<OtpCacheEntry>(key);

    if (!record) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    const expiresAt = new Date(record.expiresAt);
    if (expiresAt <= new Date()) {
      await this.cacheService.del(key);
      throw new UnauthorizedException('OTP expired or not found');
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new HttpException('Maximum OTP attempts exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    const valid = await bcrypt.compare(code, record.codeHash);

    if (!valid) {
      const attempts = record.attempts + 1;
      await this.cacheService.set(
        key,
        { ...record, attempts },
        Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
      );
      await this.prisma.otpVerification.update({
        where: { id: await this.findLatestOtpRecordId(normalizedPhone, purpose) },
        data: { attempts },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.cacheService.del(key);
    await this.prisma.otpVerification.updateMany({
      where: { phone: normalizedPhone, purpose, verifiedAt: null },
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

  composePhone(countryCode: string, mobileNumber: string): string {
    const countryDigits = countryCode.replace(/\D/g, '');
    const mobileDigits = mobileNumber.replace(/\D/g, '');
    if (!countryDigits || mobileDigits.length < 7 || mobileDigits.length > 12) {
      throw new BadRequestException('Invalid phone number format');
    }
    return this.normalizePhone(`+${countryDigits}${mobileDigits}`);
  }

  private generateOtpCode(): string {
    const max = 10 ** OTP_LENGTH;
    const num = crypto.randomInt(0, max);
    return num.toString().padStart(OTP_LENGTH, '0');
  }

  private async assertResendCooldown(phone: string, purpose: OtpPurpose): Promise<void> {
    const cooldown = await this.cacheService.get<boolean>(this.cooldownKey(phone, purpose));
    if (cooldown) {
      throw new HttpException(
        `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async assertHourlyOtpLimit(phone: string, purpose: OtpPurpose): Promise<void> {
    const result = await this.rateLimitService.consume(
      `auth:otp:${purpose}:${phone}`,
      OTP_MAX_REQUESTS_PER_HOUR,
      60 * 60 * 1000,
    );

    if (!result.allowed) {
      throw new HttpException('Too many OTP requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async invalidatePendingOtps(phone: string, purpose: OtpPurpose): Promise<void> {
    await this.cacheService.del(this.otpKey(phone, purpose));
    await this.prisma.otpVerification.updateMany({
      where: { phone, purpose, verifiedAt: null },
      data: { verifiedAt: new Date() },
    });
  }

  private async dispatchOtp(phone: string, code: string): Promise<void> {
    const sent = await this.smsProvider.send(
      phone,
      `Your FitOra verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    );

    if (!sent) {
      throw new ServiceUnavailableException('Unable to send OTP at this time');
    }

    this.logger.log(`OTP dispatched to ${phone}`);
  }

  private async findLatestOtpRecordId(phone: string, purpose: OtpPurpose): Promise<string> {
    const record = await this.prisma.otpVerification.findFirst({
      where: { phone, purpose, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!record) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    return record.id;
  }

  private otpKey(phone: string, purpose: OtpPurpose): string {
    return `auth:otp:${purpose}:${phone}`;
  }

  private cooldownKey(phone: string, purpose: OtpPurpose): string {
    return `auth:otp-cooldown:${purpose}:${phone}`;
  }
}
