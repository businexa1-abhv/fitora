import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import { type ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { type PrismaService } from '../../prisma/prisma.module';
import { hashToken } from '../../common/utils/token-hash.util';
import { type TokenPair } from '../interfaces/auth-user.interface';

interface JwtPayload {
  sub: string;
  userId: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  sessionId: string;
  deviceId: string;
  tokenVersion: number;
}

export interface TokenSessionMeta {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  os?: string;
  appVersion?: string;
  ipAddress?: string;
  userAgent?: string | string[];
}

interface TokenUser {
  id: string;
  email: string;
  isActive?: boolean;
  deletedAt?: Date | null;
  roles: { role: UserRole }[];
}

interface RefreshSessionResult {
  userId: string;
  email: string;
  user: TokenUser;
  tokens: TokenPair;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async issueTokenPair(
    userId: string,
    email: string,
    roles: UserRole[] = [UserRole.PLAYER],
    meta?: TokenSessionMeta,
  ): Promise<TokenPair> {
    const result = await this.issueTokensForUser(
      { id: userId, email, roles: roles.map((role) => ({ role })) },
      meta,
    );

    return result.tokens;
  }

  async refreshSession(
    refreshToken: string,
    meta?: TokenSessionMeta,
  ): Promise<RefreshSessionResult> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: {
        session: true,
        user: {
          include: {
            roles: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!stored.user.isActive || stored.user.deletedAt) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (stored.session) {
      if (
        !stored.session.isActive ||
        stored.session.revokedAt ||
        stored.session.expiresAt < new Date()
      ) {
        throw new UnauthorizedException('Session is inactive');
      }

      if (stored.session.refreshTokenHash && stored.session.refreshTokenHash !== tokenHash) {
        await this.revokeSession(stored.session.id);
        throw new UnauthorizedException('Refresh token reuse detected');
      }
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokensForUser(stored.user, {
      deviceId: stored.session?.deviceId ?? stored.deviceId ?? meta?.deviceId,
      deviceName: meta?.deviceName ?? stored.session?.deviceName ?? undefined,
      platform: meta?.platform ?? stored.session?.platform ?? 'mobile',
      os: meta?.os ?? stored.session?.os ?? undefined,
      appVersion: meta?.appVersion ?? stored.session?.appVersion ?? undefined,
      ipAddress: meta?.ipAddress ?? stored.session?.ipAddress ?? undefined,
      userAgent: meta?.userAgent ?? stored.session?.userAgent ?? undefined,
    });
  }

  async rotateRefreshToken(refreshToken: string): Promise<{ userId: string; email: string }> {
    const result = await this.refreshSession(refreshToken);

    return { userId: result.userId, email: result.email };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      select: { sessionId: true },
    });

    await this.prisma.refreshToken.updateMany({
      where: { token: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (stored?.sessionId) {
      await this.revokeSession(stored.sessionId);
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.userSession.updateMany({
        where: { userId, isActive: true, revokedAt: null },
        data: {
          isActive: false,
          revokedAt: now,
          refreshTokenHash: null,
          accessTokenVersion: { increment: 1 },
        },
      }),
    ]);
  }

  getAccessTokenExpiresInSeconds(): number {
    return this.parseDurationSeconds(this.configService.get('JWT_EXPIRES_IN', '15m'), 15 * 60);
  }

  private async issueTokensForUser(
    user: TokenUser,
    meta?: TokenSessionMeta,
  ): Promise<RefreshSessionResult> {
    const roles = user.roles.map((assignment) => assignment.role);
    const primaryRole = roles[0] ?? UserRole.PLAYER;
    const refreshExpiresAt = this.getRefreshTokenExpiry();
    const session = await this.upsertSession(user.id, meta, refreshExpiresAt);

    const payload: JwtPayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: primaryRole,
      roles,
      sessionId: session.id,
      deviceId: session.deviceId,
      tokenVersion: session.accessTokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    const refreshTokenHash = hashToken(refreshToken);
    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          deviceId: session.deviceId,
          token: refreshTokenHash,
          expiresAt: refreshExpiresAt,
        },
      }),
      this.prisma.userSession.update({
        where: { id: session.id },
        data: { refreshTokenHash: refreshTokenHash, expiresAt: refreshExpiresAt },
      }),
    ]);

    return {
      userId: user.id,
      email: user.email,
      user,
      tokens: { accessToken, refreshToken },
      expiresIn: this.getAccessTokenExpiresInSeconds(),
    };
  }

  private async upsertSession(userId: string, meta: TokenSessionMeta | undefined, expiresAt: Date) {
    const deviceId = this.resolveDeviceId(meta);
    const platform = meta?.platform?.trim() || 'web';
    const userAgent = Array.isArray(meta?.userAgent) ? meta.userAgent.join(', ') : meta?.userAgent;
    const now = new Date();

    return this.prisma.userSession.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: {
        userId,
        deviceId,
        deviceName: meta?.deviceName,
        platform,
        os: meta?.os,
        appVersion: meta?.appVersion,
        ipAddress: meta?.ipAddress,
        userAgent,
        expiresAt,
      },
      update: {
        deviceName: meta?.deviceName,
        platform,
        os: meta?.os,
        appVersion: meta?.appVersion,
        ipAddress: meta?.ipAddress,
        userAgent,
        expiresAt,
        isActive: true,
        revokedAt: null,
        lastLogin: now,
        lastActive: now,
        accessTokenVersion: { increment: 1 },
      },
    });
  }

  private resolveDeviceId(meta?: TokenSessionMeta): string {
    const explicit = meta?.deviceId?.trim();
    if (explicit) return explicit.slice(0, 128);

    const userAgent = Array.isArray(meta?.userAgent) ? meta.userAgent.join(', ') : meta?.userAgent;
    if (userAgent) return `ua:${hashToken(userAgent).slice(0, 48)}`;

    return `srv:${randomUUID()}`;
  }

  private async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        refreshTokenHash: null,
        accessTokenVersion: { increment: 1 },
      },
    });
  }

  private getRefreshTokenExpiry(): Date {
    const seconds = this.parseDurationSeconds(
      this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      30 * 24 * 60 * 60,
    );
    return new Date(Date.now() + seconds * 1000);
  }

  private parseDurationSeconds(value: string | undefined, fallbackSeconds: number): number {
    if (!value) return fallbackSeconds;
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) return fallbackSeconds;

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === 's') return amount;
    if (unit === 'm') return amount * 60;
    if (unit === 'h') return amount * 60 * 60;
    return amount * 24 * 60 * 60;
  }
}
