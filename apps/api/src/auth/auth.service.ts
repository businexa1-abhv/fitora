import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditAction,
  OtpPurpose,
  type User,
  UserRole,
  type UserRoleAssignment,
} from '@prisma/client';
import { getPermissionsForRoles, type UserRole as TypesUserRole } from '@fitora/types';
import { PrismaService } from '../prisma/prisma.module';
import { TenantsService } from '../tenants/tenants.service';
import { REGISTERABLE_ROLES } from './constants/auth.constants';
import {
  type AuthResponseDto,
  type ChangePasswordDto,
  type ForgotPasswordDto,
  type GoogleLoginDto,
  type LoginDto,
  type MessageResponseDto,
  type PermissionsResponseDto,
  type RegisterDto,
  type RegisterWithOtpDto,
  type ResetPasswordDto,
  type SendMobileOtpDto,
  type SendOtpDto,
  type SessionAuthResponseDto,
  type VerifyMobileOtpDto,
  type VerifyOtpDto,
} from './dto';
import { AuditService } from './services/audit.service';
import { GoogleAuthService } from './services/google-auth.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

type UserWithRoles = User & { roles: UserRoleAssignment[] };

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
    @Inject(TokenService)
    private tokenService: TokenService,
    @Inject(OtpService)
    private otpService: OtpService,
    @Inject(PasswordService)
    private passwordService: PasswordService,
    @Inject(GoogleAuthService)
    private googleAuthService: GoogleAuthService,
    @Inject(AuditService)
    private auditService: AuditService,
    @Inject(TenantsService)
    private tenantsService: TenantsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    this.assertRegisterableRole(dto.role);
    await this.assertEmailAvailable(dto.email);

    if (dto.phone) {
      await this.otpService.assertPhoneAvailable(dto.phone);
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        phone: dto.phone ? this.otpService.normalizePhone(dto.phone) : undefined,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneVerified: false,
        roles: { create: { role: dto.role } },
      },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (dto.role === UserRole.COURT_OWNER) {
      await this.tenantsService.createForCourtOwner(
        user.id,
        `${dto.firstName} ${dto.lastName}`.trim(),
      );
    }

    return this.buildAuthResponse(user);
  }

  async registerWithOtp(dto: RegisterWithOtpDto): Promise<AuthResponseDto> {
    this.assertRegisterableRole(dto.role);
    await this.assertEmailAvailable(dto.email);

    if (!dto.phone) {
      throw new BadRequestException('Phone is required for OTP registration');
    }

    const phone = this.otpService.normalizePhone(dto.phone);
    await this.otpService.assertPhoneAvailable(phone);
    await this.otpService.verifyOtp(phone, dto.otp, OtpPurpose.REGISTER);

    const passwordHash = await this.passwordService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneVerified: true,
        roles: { create: { role: dto.role } },
      },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (dto.role === UserRole.COURT_OWNER) {
      await this.tenantsService.createForCourtOwner(
        user.id,
        `${dto.firstName} ${dto.lastName}`.trim(),
      );
    }

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto, meta?: AuthMeta): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.passwordService.verifyPassword(dto.password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditService.logAuthEvent(AuditAction.LOGIN, user.id, meta);
    return this.buildAuthResponse(user, meta);
  }

  async loginWithPhone(
    dto: { phone: string; otp: string },
    meta?: AuthMeta,
  ): Promise<AuthResponseDto> {
    const phone = this.otpService.normalizePhone(dto.phone);
    await this.otpService.verifyOtp(phone, dto.otp, OtpPurpose.LOGIN);

    const user = await this.otpService.findUserByPhone(phone);

    if (!user) {
      throw new UnauthorizedException('No account found for this phone number');
    }

    await this.auditService.logAuthEvent(AuditAction.LOGIN, user.id, meta);
    return this.buildAuthResponse(user, meta);
  }

  async loginWithGoogle(dto: GoogleLoginDto, meta?: AuthMeta): Promise<AuthResponseDto> {
    const googleUser = await this.googleAuthService.verifyIdToken(dto.idToken);

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
        deletedAt: null,
      },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (!user) {
      if (dto.role) {
        this.assertRegisterableRole(dto.role);
      }

      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          googleId: googleUser.googleId,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          avatarUrl: googleUser.avatarUrl,
          emailVerified: googleUser.emailVerified,
          roles: { create: { role: dto.role ?? UserRole.PLAYER } },
        },
        include: { roles: { where: { deletedAt: null } } },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.googleId,
          avatarUrl: user.avatarUrl ?? googleUser.avatarUrl,
          emailVerified: user.emailVerified || googleUser.emailVerified,
        },
        include: { roles: { where: { deletedAt: null } } },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.auditService.logAuthEvent(AuditAction.LOGIN, user.id, meta);
    return this.buildAuthResponse(user, meta);
  }

  async sendMobileOtp(dto: SendMobileOtpDto): Promise<{ message: string; expiresIn: number }> {
    const phone = this.otpService.composePhone(dto.countryCode, dto.mobileNumber);
    return this.otpService.sendOtp(phone, OtpPurpose.LOGIN);
  }

  async verifyMobileOtp(dto: VerifyMobileOtpDto, meta?: AuthMeta): Promise<SessionAuthResponseDto> {
    const phone = this.otpService.composePhone(dto.countryCode, dto.mobileNumber);
    await this.otpService.verifyOtp(phone, dto.otp, OtpPurpose.LOGIN);

    let user = await this.otpService.findUserByPhone(phone);
    const isNewUser = !user;
    if (!user) {
      const name = this.splitName(dto.name);
      user = await this.prisma.user.create({
        data: {
          email: this.buildPhoneEmail(phone),
          phone,
          firstName: name.firstName,
          lastName: name.lastName,
          avatarUrl: dto.profileImage,
          phoneVerified: true,
          roles: { create: { role: UserRole.PLAYER } },
        },
        include: { roles: { where: { deletedAt: null } } },
      });
    } else if (!user.phoneVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
        include: { roles: { where: { deletedAt: null } } },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.auditService.logAuthEvent(AuditAction.LOGIN, user.id, meta);

    return this.buildSessionAuthResponse(
      user,
      {
        ...meta,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        platform: dto.platform,
        os: dto.os,
        appVersion: dto.appVersion,
      },
      isNewUser,
    );
  }

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; expiresIn: number }> {
    const phone = this.otpService.normalizePhone(dto.phone);

    if (dto.purpose === OtpPurpose.LOGIN) {
      const user = await this.otpService.findUserByPhone(phone);
      if (!user) {
        throw new UnauthorizedException('No account found for this phone number');
      }
    }

    if (dto.purpose === OtpPurpose.REGISTER) {
      await this.otpService.assertPhoneAvailable(phone);
    }

    return this.otpService.sendOtp(phone, dto.purpose);
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto | MessageResponseDto> {
    const phone = this.otpService.normalizePhone(dto.phone);
    await this.otpService.verifyOtp(phone, dto.otp, dto.purpose);

    if (dto.purpose === OtpPurpose.VERIFY_PHONE) {
      const user = await this.otpService.findUserByPhone(phone);
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { phoneVerified: true },
        });
      }
      return { message: 'Phone verified successfully' };
    }

    if (dto.purpose === OtpPurpose.LOGIN) {
      const user = await this.otpService.findUserByPhone(phone);
      if (!user) {
        throw new UnauthorizedException('No account found for this phone number');
      }
      return this.buildAuthResponse(user);
    }

    if (dto.purpose === OtpPurpose.REGISTER) {
      if (!dto.email || !dto.firstName || !dto.lastName || !dto.role) {
        throw new BadRequestException(
          'email, firstName, lastName, and role are required for registration',
        );
      }

      this.assertRegisterableRole(dto.role);
      await this.assertEmailAvailable(dto.email);
      await this.otpService.assertPhoneAvailable(phone);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneVerified: true,
          roles: { create: { role: dto.role } },
        },
        include: { roles: { where: { deletedAt: null } } },
      });

      return this.buildAuthResponse(user);
    }

    throw new BadRequestException('Unsupported OTP purpose');
  }

  async refresh(refreshToken: string, meta?: AuthMeta): Promise<AuthResponseDto> {
    const result = await this.tokenService.refreshSession(refreshToken, meta);

    return {
      user: this.formatUser(result.user as UserWithRoles),
      tokens: result.tokens,
    };
  }

  async refreshMobile(refreshToken: string, meta?: AuthMeta): Promise<SessionAuthResponseDto> {
    const result = await this.tokenService.refreshSession(refreshToken, meta);

    return {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.expiresIn,
      user: this.formatUser(result.user as UserWithRoles),
      isNewUser: false,
      requiresOnboarding: this.requiresPlayerOnboarding(result.user as UserWithRoles),
    };
  }

  async logout(refreshToken: string, _meta?: AuthMeta): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string, meta?: AuthMeta): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
    await this.auditService.logAuthEvent(AuditAction.LOGOUT, userId, meta);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.passwordService.requestReset(dto.email);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.passwordService.resetPassword(dto.token, dto.newPassword);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponseDto> {
    return this.passwordService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  async getMe(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatUser(user);
  }

  async getPermissions(userId: string): Promise<PermissionsResponseDto> {
    const user = await this.getMe(userId);
    return { roles: user.roles, permissions: user.permissions };
  }

  private async buildAuthResponse(user: UserWithRoles, meta?: AuthMeta): Promise<AuthResponseDto> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.roles.map((r) => r.role);
    const tokens = await this.tokenService.issueTokenPair(user.id, user.email, roles, meta);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  private async buildSessionAuthResponse(
    user: UserWithRoles,
    meta?: AuthMeta,
    isNewUser = false,
  ): Promise<SessionAuthResponseDto> {
    const response = await this.buildAuthResponse(user, meta);

    return {
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      expiresIn: this.tokenService.getAccessTokenExpiresInSeconds(),
      user: response.user,
      isNewUser,
      requiresOnboarding: isNewUser || this.requiresPlayerOnboarding(user),
    };
  }

  private formatUser(user: UserWithRoles): AuthResponseDto['user'] {
    const roles = user.roles.map((r) => r.role);
    const permissions = getPermissionsForRoles(roles as TypesUserRole[]);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    };
  }

  private assertRegisterableRole(role: UserRole): void {
    if (!REGISTERABLE_ROLES.includes(role)) {
      throw new ForbiddenException('This role cannot be self-assigned');
    }
  }

  private buildPhoneEmail(phone: string): string {
    return `phone.${phone.replace(/\D/g, '')}@fitora.local`;
  }

  private requiresPlayerOnboarding(user: UserWithRoles): boolean {
    const isPlayer = user.roles.some((role) => role.role === UserRole.PLAYER);
    if (!isPlayer || !user.phone) return false;

    return user.email === this.buildPhoneEmail(user.phone);
  }

  private splitName(name?: string): { firstName: string; lastName: string } {
    const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (parts.length === 0) {
      return { firstName: 'Player', lastName: '' };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }
  }
}

export interface AuthMeta {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  os?: string;
  appVersion?: string;
}
