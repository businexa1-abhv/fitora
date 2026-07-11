import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { GoogleAuthService } from './services/google-auth.service';
import { AuditService } from './services/audit.service';
import { PrismaService } from '../prisma/prisma.module';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;
  let passwordService: jest.Mocked<Pick<PasswordService, 'hashPassword' | 'verifyPassword'>>;
  let tokenService: jest.Mocked<Pick<TokenService, 'issueTokenPair'>>;

  const mockUser = {
    id: 'user-1',
    email: 'player@example.com',
    phone: null,
    passwordHash: 'hash',
    googleId: null,
    firstName: 'Test',
    lastName: 'Player',
    avatarUrl: null,
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    lastLoginAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [{ id: 'role-1', userId: 'user-1', role: UserRole.PLAYER, entityId: null, grantedBy: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<Pick<PrismaService, 'user'>>;

    passwordService = {
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      verifyPassword: jest.fn(),
    };

    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
        { provide: OtpService, useValue: { normalizePhone: jest.fn(), assertPhoneAvailable: jest.fn(), verifyOtp: jest.fn(), findUserByPhone: jest.fn() } },
        { provide: PasswordService, useValue: passwordService },
        { provide: GoogleAuthService, useValue: { verifyIdToken: jest.fn() } },
        { provide: AuditService, useValue: { logAuthEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejects admin self-registration', async () => {
    await expect(
      service.register({
        email: 'admin@example.com',
        password: 'SecurePass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('logs in with valid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    passwordService.verifyPassword.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.login({
      email: 'player@example.com',
      password: 'SecurePass123!',
    });

    expect(result.tokens.accessToken).toBe('access');
    expect(result.user.roles).toContain(UserRole.PLAYER);
  });

  it('rejects invalid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    passwordService.verifyPassword.mockResolvedValue(false);

    await expect(
      service.login({ email: 'player@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('registers a new player', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);
    tokenService.issueTokenPair.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

    const result = await service.register({
      email: 'new@f.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.PLAYER,
    });

    expect(result.user.email).toBe('player@example.com');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('refresh returns new tokens', async () => {
    const tokenServiceFull = {
      issueTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      }),
      rotateRefreshToken: jest.fn().mockResolvedValue({
        userId: 'user-1',
        email: 'player@example.com',
      }),
    };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenServiceFull },
        { provide: OtpService, useValue: { normalizePhone: jest.fn(), assertPhoneAvailable: jest.fn(), verifyOtp: jest.fn(), findUserByPhone: jest.fn() } },
        { provide: PasswordService, useValue: passwordService },
        { provide: GoogleAuthService, useValue: { verifyIdToken: jest.fn() } },
        { provide: AuditService, useValue: { logAuthEvent: jest.fn() } },
      ],
    }).compile();
    const refreshService = module.get(AuthService);

    const result = await refreshService.refresh('old-refresh');
    expect(result.tokens.accessToken).toBe('new-access');
  });

  it('getMe returns user profile', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);

    const profile = await service.getMe('user-1');
    expect(profile.email).toBe('player@example.com');
  });

  it('getPermissions returns roles and permissions', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);

    const perms = await service.getPermissions('user-1');
    expect(perms.roles).toContain(UserRole.PLAYER);
    expect(perms.permissions.length).toBeGreaterThan(0);
  });
});
