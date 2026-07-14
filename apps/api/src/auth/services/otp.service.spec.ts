import { Test, type TestingModule } from '@nestjs/testing';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './otp.service';
import { PrismaService } from '../../prisma/prisma.module';
import { CacheService } from '../../common/redis/cache.service';
import { RateLimitService } from '../../common/redis/rate-limit.service';
import { SmsProvider } from '../../notifications/providers/sms.provider';

jest.mock('bcryptjs');

interface MockPrisma {
  otpVerification: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  user: { findFirst: jest.Mock };
}

interface MockCacheService {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
}

interface MockRateLimitService {
  consume: jest.Mock;
}

interface MockSmsProvider {
  send: jest.Mock;
}

describe('OtpService', () => {
  let service: OtpService;
  let prisma: MockPrisma;
  let cache: MockCacheService;
  let rateLimit: MockRateLimitService;
  let smsProvider: MockSmsProvider;

  beforeEach(async () => {
    prisma = {
      otpVerification: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    rateLimit = {
      consume: jest.fn().mockResolvedValue({ allowed: true, remaining: 4 }),
    };
    smsProvider = {
      send: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: RateLimitService, useValue: rateLimit },
        { provide: SmsProvider, useValue: smsProvider },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  it('normalizes phone numbers', () => {
    expect(service.normalizePhone('9876543210')).toBe('+9876543210');
    expect(service.normalizePhone('+919876543210')).toBe('+919876543210');
  });

  it('verifies valid OTP', async () => {
    cache.get.mockResolvedValue({
      phone: '+919876543210',
      codeHash: 'hash',
      purpose: OtpPurpose.LOGIN,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prisma.otpVerification.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.verifyOtp('+919876543210', '123456', OtpPurpose.LOGIN),
    ).resolves.toBeUndefined();
    expect(cache.del).toHaveBeenCalledWith('auth:otp:LOGIN:+919876543210');
  });

  it('sendOtp creates verification record', async () => {
    prisma.otpVerification.create.mockResolvedValue({ id: 'otp-new' } as never);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash');

    const result = await service.sendOtp('+919876543210', OtpPurpose.LOGIN);
    expect(result.message).toBeDefined();
    expect(result.expiresIn).toBeGreaterThan(0);
    expect(cache.set).toHaveBeenCalledWith(
      'auth:otp:LOGIN:+919876543210',
      expect.objectContaining({ codeHash: 'hash', attempts: 0 }),
      300,
    );
    expect(smsProvider.send).toHaveBeenCalled();
  });

  it('assertPhoneAvailable rejects taken phone', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' } as never);
    await expect(service.assertPhoneAvailable('+919876543210')).rejects.toThrow();
  });
});
