import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './otp.service';
import { PrismaService } from '../../prisma/prisma.module';

jest.mock('bcryptjs');

describe('OtpService', () => {
  let service: OtpService;
  let prisma: jest.Mocked<Pick<PrismaService, 'otpVerification' | 'user'>>;

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
    } as unknown as jest.Mocked<Pick<PrismaService, 'otpVerification' | 'user'>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue?: string) => defaultValue ?? 'mock'),
          },
        },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  it('normalizes phone numbers', () => {
    expect(service.normalizePhone('9876543210')).toBe('+9876543210');
    expect(service.normalizePhone('+919876543210')).toBe('+919876543210');
  });

  it('verifies valid OTP', async () => {
    prisma.otpVerification.findFirst.mockResolvedValue({
      id: 'otp-1',
      phone: '+919876543210',
      codeHash: 'hash',
      purpose: OtpPurpose.LOGIN,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60000),
      verifiedAt: null,
      createdAt: new Date(),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prisma.otpVerification.update.mockResolvedValue({} as never);

    await expect(
      service.verifyOtp('+919876543210', '123456', OtpPurpose.LOGIN),
    ).resolves.toBeUndefined();
  });

  it('sendOtp creates verification record', async () => {
    prisma.otpVerification.findFirst.mockResolvedValue(null);
    prisma.otpVerification.create.mockResolvedValue({ id: 'otp-new' } as never);
    (require('bcryptjs').hash as jest.Mock).mockResolvedValue('hash');

    const result = await service.sendOtp('+919876543210', OtpPurpose.LOGIN);
    expect(result.message).toBeDefined();
    expect(result.expiresIn).toBeGreaterThan(0);
  });

  it('assertPhoneAvailable rejects taken phone', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' } as never);
    await expect(service.assertPhoneAvailable('+919876543210')).rejects.toThrow();
  });
});
