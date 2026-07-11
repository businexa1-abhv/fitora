import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, OtpPurpose, UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AuditService } from './services/audit.service';
import { PrismaService } from '../prisma/prisma.module';

describe('AuthService (extended)', () => {
  let service: AuthService;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;
  let otpService: jest.Mocked<
    Pick<
      OtpService,
      | 'normalizePhone'
      | 'assertPhoneAvailable'
      | 'verifyOtp'
      | 'findUserByPhone'
      | 'sendOtp'
    >
  >;
  let passwordService: jest.Mocked<
    Pick<
      PasswordService,
      'hashPassword' | 'verifyPassword' | 'requestReset' | 'resetPassword' | 'changePassword'
    >
  >;
  let tokenService: jest.Mocked<
    Pick<TokenService, 'issueTokenPair' | 'rotateRefreshToken' | 'revokeRefreshToken' | 'revokeAllUserTokens'>
  >;
  let googleAuthService: jest.Mocked<Pick<GoogleAuthService, 'verifyIdToken'>>;
  let auditService: jest.Mocked<Pick<AuditService, 'logAuthEvent'>>;

  const mockUser = {
    id: 'user-1',
    email: 'player@example.com',
    phone: '+919876543210',
    passwordHash: 'hash',
    googleId: null,
    firstName: 'Test',
    lastName: 'Player',
    avatarUrl: null,
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    lastLoginAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [
      {
        id: 'role-1',
        userId: 'user-1',
        role: UserRole.PLAYER,
        entityId: null,
        grantedBy: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as typeof prisma;

    otpService = {
      normalizePhone: jest.fn((p: string) => (p.startsWith('+') ? p : `+91${p}`)),
      assertPhoneAvailable: jest.fn(),
      verifyOtp: jest.fn(),
      findUserByPhone: jest.fn(),
      sendOtp: jest.fn().mockResolvedValue({ message: 'OTP sent', expiresIn: 300 }),
    };

    passwordService = {
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      verifyPassword: jest.fn(),
      requestReset: jest.fn().mockResolvedValue({ message: 'Reset email sent' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'Password reset' }),
      changePassword: jest.fn().mockResolvedValue({ message: 'Password changed' }),
    };

    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
      rotateRefreshToken: jest.fn().mockResolvedValue({ userId: 'user-1', email: 'player@example.com' }),
      revokeRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    googleAuthService = {
      verifyIdToken: jest.fn().mockResolvedValue({
        googleId: 'gid-1',
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
        avatarUrl: null,
        emailVerified: true,
      }),
    };

    auditService = { logAuthEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
        { provide: OtpService, useValue: otpService },
        { provide: PasswordService, useValue: passwordService },
        { provide: GoogleAuthService, useValue: googleAuthService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('registerWithOtp creates verified user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.registerWithOtp({
      email: 'new@f.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
      phone: '9876543210',
      otp: '123456',
      role: UserRole.PLAYER,
    });

    expect(result.tokens.accessToken).toBe('at');
    expect(otpService.verifyOtp).toHaveBeenCalled();
  });

  it('loginWithPhone authenticates via OTP', async () => {
    otpService.findUserByPhone.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.loginWithPhone({ phone: '9876543210', otp: '123456' });
    expect(result.user.id).toBe('user-1');
    expect(auditService.logAuthEvent).toHaveBeenCalledWith(AuditAction.LOGIN, 'user-1', undefined);
  });

  it('loginWithPhone rejects unknown phone', async () => {
    otpService.findUserByPhone.mockResolvedValue(null);
    await expect(
      service.loginWithPhone({ phone: '9876543210', otp: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loginWithGoogle creates new user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.loginWithGoogle({ idToken: 'google-token' });
    expect(result.tokens.accessToken).toBe('at');
  });

  it('loginWithGoogle links existing email account', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...mockUser, googleId: null });
    prisma.user.update.mockResolvedValue({ ...mockUser, googleId: 'gid-1' });

    await service.loginWithGoogle({ idToken: 'google-token' });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('sendOtp rejects login for unknown phone', async () => {
    otpService.findUserByPhone.mockResolvedValue(null);
    await expect(
      service.sendOtp({ phone: '9876543210', purpose: OtpPurpose.LOGIN }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sendOtp sends OTP for register', async () => {
    const result = await service.sendOtp({ phone: '9876543210', purpose: OtpPurpose.REGISTER });
    expect(result.expiresIn).toBe(300);
  });

  it('verifyOtp returns message for phone verification', async () => {
    otpService.findUserByPhone.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.verifyOtp({
      phone: '9876543210',
      otp: '123456',
      purpose: OtpPurpose.VERIFY_PHONE,
    });

    expect(result).toEqual({ message: 'Phone verified successfully' });
  });

  it('verifyOtp registers user when purpose is REGISTER', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.verifyOtp({
      phone: '9876543210',
      otp: '123456',
      purpose: OtpPurpose.REGISTER,
      email: 'new@f.com',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.PLAYER,
    });

    expect('tokens' in result).toBe(true);
  });

  it('verifyOtp rejects register without required fields', async () => {
    await expect(
      service.verifyOtp({
        phone: '9876543210',
        otp: '123456',
        purpose: OtpPurpose.REGISTER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('logout revokes refresh token', async () => {
    await service.logout('refresh-token');
    expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('refresh-token');
  });

  it('logoutAll revokes all tokens and logs audit', async () => {
    await service.logoutAll('user-1');
    expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    expect(auditService.logAuthEvent).toHaveBeenCalled();
  });

  it('forgotPassword delegates to password service', async () => {
    const result = await service.forgotPassword({ email: 'player@example.com' });
    expect(result.message).toContain('Reset');
  });

  it('resetPassword delegates to password service', async () => {
    const result = await service.resetPassword({ token: 'tok', newPassword: 'NewPass123!' });
    expect(result.message).toContain('Password');
  });

  it('changePassword delegates to password service', async () => {
    const result = await service.changePassword('user-1', {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    });
    expect(result.message).toContain('Password');
  });

  it('register rejects duplicate email', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    await expect(
      service.register({
        email: 'player@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'Player',
        role: UserRole.PLAYER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('getMe throws for missing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.getMe('missing')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
