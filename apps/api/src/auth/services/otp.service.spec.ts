import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { OtpService } from './otp.service';
import { PrismaService } from '../../prisma/prisma.module';

describe('OtpService', () => {
  let service: OtpService;
  let prisma: {
    otpVerification: {
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      otpVerification: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'otp-new' }),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock') },
        },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  it('normalizes 10-digit Indian numbers to +91', () => {
    expect(service.normalizePhone('9876543210')).toBe('+919876543210');
  });

  it('sendOtp creates verification record', async () => {
    prisma.otpVerification.findFirst.mockResolvedValue(null);

    const result = await service.sendOtp('+919876543210', OtpPurpose.LOGIN);

    expect(result.message).toBe('OTP sent successfully');
    expect(result.expiresIn).toBe(300);
    expect(prisma.otpVerification.create).toHaveBeenCalled();
  });

  it('verifyOtp returns purpose on success', async () => {
    const bcrypt = await import('bcryptjs');
    const codeHash = await bcrypt.hash('123456', 4);
    prisma.otpVerification.findFirst.mockResolvedValue({
      id: 'otp-1',
      phone: '+919876543210',
      purpose: OtpPurpose.LOGIN,
      attempts: 0,
      codeHash,
      expiresAt: new Date(Date.now() + 60_000),
      verifiedAt: null,
    });
    prisma.otpVerification.update.mockResolvedValue({});

    const purpose = await service.verifyOtp('+919876543210', '123456');
    expect(purpose).toBe(OtpPurpose.LOGIN);
  });

  it('enforces hourly rate limit', async () => {
    prisma.otpVerification.count.mockResolvedValue(3);
    await expect(service.sendOtp('+919876543210', OtpPurpose.LOGIN)).rejects.toThrow(
      /Too many OTP requests/,
    );
  });
});