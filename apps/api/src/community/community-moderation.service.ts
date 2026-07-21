import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { ReportDto } from './dto/community.dto';

@Injectable()
export class CommunityModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async report(userId: string, dto: ReportDto) {
    const report = await this.prisma.communityReport.create({
      data: {
        reporterId: userId,
        groupId: dto.groupId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
      },
    });
    return {
      id: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    };
  }
}
