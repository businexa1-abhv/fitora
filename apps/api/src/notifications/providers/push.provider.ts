import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    const mode = this.config.get('PUSH_MODE', 'mock');
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (!tokens?.length) return;

    if (mode === 'mock') {
      this.logger.log(`[PUSH MOCK] user=${userId} tokens=${tokens.length} | ${title}: ${body}`);
      return;
    }

    const expoTokens = tokens.filter((t) => this.isExpoToken(t.token)).map((t) => t.token);
    const fcmTokens = tokens.filter((t) => !this.isExpoToken(t.token)).map((t) => t.token);

    await Promise.all([
      expoTokens.length ? this.sendExpo(expoTokens, title, body, data) : Promise.resolve(),
      fcmTokens.length ? this.sendFcmBatch(fcmTokens, title, body, data) : Promise.resolve(),
    ]);
  }

  private isExpoToken(token: string) {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken');
  }

  private async sendExpo(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      const messages = tokens.map((to) => ({
        to,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        priority: 'high',
      }));

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.error(`Expo push error: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error('Expo push send failed', err);
    }
  }

  private async sendFcmBatch(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase not configured — push mock fallback');
      this.logger.log(`[PUSH MOCK] ${title}: ${body}`);
      return;
    }

    const accessToken = await this.getAccessToken(clientEmail, privateKey);
    if (!accessToken) return;

    await Promise.all(
      tokens.map((token) => this.sendFcm(projectId, accessToken, token, title, body, data)),
    );
  }

  private async getAccessToken(clientEmail: string, privateKey: string) {
    try {
      const client = new JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
      const token = await client.getAccessToken();
      return token.token ?? null;
    } catch (err) {
      this.logger.error('Firebase auth failed', err);
      return null;
    }
  }

  private async sendFcm(
    projectId: string,
    accessToken: string,
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: deviceToken,
              notification: { title, body },
              data: data ?? {},
            },
          }),
        },
      );
      if (!res.ok) {
        this.logger.error(`FCM error: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error('FCM send failed', err);
    }
  }
}
