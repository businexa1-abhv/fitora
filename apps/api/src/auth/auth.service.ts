import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, OtpPurpose, User, UserRole, UserRoleAssignment } from '@prisma/client';
import { getPermissionsForRoles, Permission, UserRole as TypesUserRole } from '@fitora/types';
import { PrismaService } from '../prisma/prisma.module';
import { TenantsService } from '../tenants/tenants.service';
import { REGISTERABLE_ROLES } from './constants/auth.constants';
import {
  AuthResponseDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  MessageResponseDto,
  PermissionsResponseDto,
  RegisterDto,
  RegisterWithOtpDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto';
import { AuthenticatedUser } from './interfaces/auth-user.interface';
import { AuditService } from './services/audit.service';
import { GoogleAuthService } from './services/google-auth.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

type UserWithRoles = User & {
  roles: UserRoleAssignment[];
  playerProfile?: { onboardingCompletedAt: Date | null } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private otpService: OtpService,
    private passwordService: PasswordService,
    private googleAuthService: GoogleAuthService,
    private auditService: AuditService,
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
    return this.buildAuthResponse(user);
  }

  async loginWithPhone(dto: { phone: string; otp: string }, meta?: AuthMeta): Promise<AuthResponseDto> {
    const phone = this.otpService.normalizePhone(dto.phone);
    await this.otpService.verifyOtp(phone, dto.otp, OtpPurpose.LOGIN);

    const user = await this.otpService.findUserByPhone(phone);

    if (!user) {
      throw new UnauthorizedException('No account found for this phone number');
    }

    await this.auditService.logAuthEvent(AuditAction.LOGIN, user.id, meta);
    return this.buildAuthResponse(user);
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
    return this.buildAuthResponse(user);
  }

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; expiresIn: number }> {
    const phone = this.otpService.normalizePhone(dto.phone);
    let purpose = dto.purpose;

    if (!purpose) {
      const user = await this.otpService.findUserByPhone(phone);
      purpose = user ? OtpPurpose.LOGIN : OtpPurpose.REGISTER;
    }

    if (purpose === OtpPurpose.LOGIN) {
      const user = await this.otpService.findUserByPhone(phone);
      if (!user) {
        throw new UnauthorizedException('No account found for this phone number');
      }
    }

    if (purpose === OtpPurpose.REGISTER) {
      await this.otpService.assertPhoneAvailable(phone);
    }

    return this.otpService.sendOtp(phone, purpose);
  }

  /** Player mobile auth: send OTP without requiring purpose */
  async sendPlayerOtp(dto: { phone: string }): Promise<{ message: string; expiresIn: number }> {
    return this.sendOtp({ phone: dto.phone });
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto | MessageResponseDto> {
    const phone = this.otpService.normalizePhone(dto.phone);
    const purpose = await this.otpService.verifyOtp(phone, dto.otp, dto.purpose);

    if (purpose === OtpPurpose.VERIFY_PHONE) {
      const user = await this.otpService.findUserByPhone(phone);
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { phoneVerified: true },
        });
      }
      return { message: 'Phone verified successfully' };
    }

    if (purpose === OtpPurpose.LOGIN) {
      const user = await this.otpService.findUserByPhone(phone);
      if (!user) {
        throw new UnauthorizedException('No account found for this phone number');
      }
      return this.buildAuthResponse(user, { deviceId: dto.deviceId });
    }

    if (purpose === OtpPurpose.REGISTER) {
      // Full registration payload provided (legacy / web)
      if (dto.email && dto.firstName && dto.lastName && dto.role) {
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
          include: {
            roles: { where: { deletedAt: null } },
            playerProfile: true,
          },
        });

        return this.buildAuthResponse(user, { deviceId: dto.deviceId, isNewUser: true });
      }

      // Player phone-first stub account — profile completed later
      return this.createPlayerStub(phone, dto.deviceId);
    }

    throw new BadRequestException('Unsupported OTP purpose');
  }

  /** Player mobile auth: verify OTP and login or create stub player */
  async verifyPlayerOtp(dto: {
    phone: string;
    otp: string;
    deviceId?: string;
  }): Promise<AuthResponseDto> {
    const phone = this.otpService.normalizePhone(dto.phone);
    const purpose = await this.otpService.verifyOtp(phone, dto.otp);

    if (purpose === OtpPurpose.LOGIN) {
      const user = await this.otpService.findUserByPhone(phone);
      if (!user) {
        throw new UnauthorizedException('No account found for this phone number');
      }
      await this.auditService.logAuthEvent(AuditAction.LOGIN, user.id, undefined);
      return this.buildAuthResponse(user, { deviceId: dto.deviceId });
    }

    if (purpose === OtpPurpose.REGISTER) {
      return this.createPlayerStub(phone, dto.deviceId);
    }

    throw new BadRequestException('Unsupported OTP purpose for player auth');
  }

  private async createPlayerStub(phone: string, deviceId?: string): Promise<AuthResponseDto> {
    await this.otpService.assertPhoneAvailable(phone);
    const digits = phone.replace(/\D/g, '');
    const email = `u${digits}@users.fitora.app`;

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        firstName: 'Player',
        lastName: '',
        phoneVerified: true,
        roles: { create: { role: UserRole.PLAYER } },
        playerProfile: { create: {} },
      },
      include: {
        roles: { where: { deletedAt: null } },
        playerProfile: true,
      },
    });

    await this.auditService.logAuthEvent(AuditAction.CREATE, user.id, undefined);
    return this.buildAuthResponse(user, { deviceId, isNewUser: true });
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const { userId } = await this.tokenService.rotateRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken: string, meta?: AuthMeta): Promise<void> {
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
      include: {
        roles: { where: { deletedAt: null } },
        playerProfile: { where: { deletedAt: null } },
      },
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

  private async buildAuthResponse(
    user: UserWithRoles,
    options?: { deviceId?: string; isNewUser?: boolean },
  ): Promise<AuthResponseDto> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.tokenService.issueTokenPair(user.id, user.email, {
      deviceId: options?.deviceId,
    });

    // Ensure playerProfile is loaded for onboarding flag
    let profile = user.playerProfile;
    if (profile === undefined) {
      profile = await this.prisma.playerProfile.findFirst({
        where: { userId: user.id, deletedAt: null },
      });
    }

    return {
      user: this.formatUser({ ...user, playerProfile: profile }),
      tokens,
      isNewUser: options?.isNewUser,
    };
  }

  private formatUser(user: UserWithRoles): AuthResponseDto['user'] {
    const roles = user.roles.map((r) => r.role);
    const permissions = getPermissionsForRoles(roles as TypesUserRole[]);
    const onboardingComplete = Boolean(user.playerProfile?.onboardingCompletedAt);

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
      onboardingComplete,
    };
  }

  private assertRegisterableRole(role: UserRole): void {
    if (!REGISTERABLE_ROLES.includes(role)) {
      throw new ForbiddenException('This role cannot be self-assigned');
    }
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
}
