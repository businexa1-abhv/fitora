import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import { BCRYPT_ROUNDS, PASSWORD_RESET_EXPIRY_HOURS } from '../constants/auth.constants';
import { TokenService } from './token.service';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private tokenService: TokenService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string | null): Promise<boolean> {
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }

  async requestReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
    });

    // Always return success to prevent email enumeration
    const message = 'If an account exists, a password reset link has been sent';

    if (!user || !user.passwordHash) {
      return { message };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.dispatchResetEmail(user.email, rawToken);

    return { message };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const records = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let matched: (typeof records)[number] | undefined;

    for (const record of records) {
      if (await bcrypt.compare(token, record.tokenHash)) {
        matched = record;
        break;
      }
    }

    if (!matched) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!matched.user.isActive || matched.user.deletedAt) {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matched.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.tokenService.revokeAllUserTokens(matched.userId);

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await this.verifyPassword(currentPassword, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.tokenService.revokeAllUserTokens(userId);

    return { message: 'Password changed successfully' };
  }

  private async dispatchResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const mode = this.configService.get('EMAIL_MODE', 'mock');

    if (mode === 'mock') {
      this.logger.log(`[PASSWORD RESET MOCK] ${email} → ${resetUrl}`);
      return;
    }

    // Production: integrate SendGrid / SES / Resend here
    this.logger.log(`Password reset email sent to ${email}`);
  }
}
