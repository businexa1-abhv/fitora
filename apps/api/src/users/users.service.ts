import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
      omit: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      roles: user.roles.map((r) => r.role),
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { roles: true },
      omit: { passwordHash: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      ...user,
      roles: user.roles.map((r) => r.role),
    }));
  }
}
