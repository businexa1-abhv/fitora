import { NotFoundException } from '@nestjs/common';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';

export async function resolveTenant(prisma: PrismaService, user: AuthUserPayload) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id, isActive: true, deletedAt: null } } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  return tenant;
}
