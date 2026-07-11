import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client | null = null;

  constructor(private configService: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');

    if (!clientId) {
      throw new UnauthorizedException('Google login is not configured');
    }

    const client = this.getClient();
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return this.mapPayload(payload);
  }

  private getClient(): OAuth2Client {
    if (!this.client) {
      this.client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
    }
    return this.client;
  }

  private mapPayload(payload: TokenPayload): GoogleUserInfo {
    const email = payload.email!;
    const nameParts = (payload.name ?? email.split('@')[0]).split(' ');

    return {
      googleId: payload.sub!,
      email: email.toLowerCase(),
      firstName: payload.given_name ?? nameParts[0] ?? 'User',
      lastName: payload.family_name ?? (nameParts.slice(1).join(' ') || ''),
      avatarUrl: payload.picture,
      emailVerified: payload.email_verified ?? false,
    };
  }
}
