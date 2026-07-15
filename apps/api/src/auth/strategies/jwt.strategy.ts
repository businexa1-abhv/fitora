import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getPermissionsForRoles, type UserRole as TypesUserRole } from '@fitora/types';
import { type UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';

interface JwtPayload {
  sub: string;
  userId?: string;
  email: string;
  role?: UserRole;
  roles?: UserRole[];
  sessionId?: string;
  deviceId?: string;
  tokenVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService)
    configService: ConfigService,
    @Inject(PrismaService)
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      include: { roles: { where: { deletedAt: null } } },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (payload.sessionId) {
      const session = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.userId ?? payload.sub,
          deviceId: payload.deviceId,
          isActive: true,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session || session.accessTokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Session expired');
      }

      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastActive: new Date() },
      });
    }

    const roles = user.roles.map((r) => r.role);

    return {
      id: user.id,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: getPermissionsForRoles(roles as TypesUserRole[]),
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    };
  }
}
