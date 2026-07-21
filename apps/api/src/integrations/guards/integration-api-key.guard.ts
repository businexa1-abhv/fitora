import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IntegrationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { IntegrationCryptoService } from '../integration-crypto.service';

export type IntegrationRequest = {
  headers: Record<string, string | string[] | undefined>;
  integration?: {
    id: string;
    tenantId: string;
    provider: string;
    ownerId: string;
  };
  user?: { id: string; roles: UserRole[] };
};

@Injectable()
export class IntegrationApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: IntegrationCryptoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IntegrationRequest>();
    const header = request.headers['x-fitora-api-key'];
    const rawKey = Array.isArray(header) ? header[0] : header;
    if (!rawKey) throw new UnauthorizedException('Missing x-fitora-api-key');

    const connection = await this.prisma.integrationConnection.findFirst({
      where: {
        apiKeyHash: this.crypto.hashApiKey(rawKey),
        status: IntegrationStatus.ACTIVE,
      },
    });
    if (!connection) throw new UnauthorizedException('Invalid integration API key');
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: connection.tenantId },
      select: { ownerId: true },
    });
    if (!tenant) throw new UnauthorizedException('Integration tenant no longer exists');
    request.integration = {
      id: connection.id,
      tenantId: connection.tenantId,
      provider: connection.provider,
      ownerId: tenant.ownerId,
    };
    // Allows the global permission guard to apply the existing owner policy.
    request.user = { id: tenant.ownerId, roles: [UserRole.COURT_OWNER] };
    return true;
  }
}

const PassportJwtGuard = AuthGuard('jwt');

@Injectable()
export class IntegrationOrJwtGuard implements CanActivate {
  constructor(private readonly integrationGuard: IntegrationApiKeyGuard) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<IntegrationRequest>();
    if (request.headers['x-fitora-api-key']) {
      return this.integrationGuard.canActivate(context);
    }
    return new PassportJwtGuard().canActivate(context);
  }
}
