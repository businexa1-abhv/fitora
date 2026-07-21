import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunityEventsService } from '../realtime/community-events.service';
import { CreateAnnouncementDto } from './dto/community.dto';
import { isModeratorRole, mapAnnouncement, userSummarySelect } from './community.mapper';

@Injectable()
export class CommunityAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: CommunityEventsService,
  ) {}

  async create(userId: string, groupId: string, dto: CreateAnnouncementDto) {
    const membership = await this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || !isModeratorRole(membership.role)) {
      throw new ForbiddenException('Moderator access required');
    }

    const announcement = await this.prisma.communityAnnouncement.create({
      data: {
        groupId,
        authorId: userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned ?? true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: { author: { select: userSummarySelect } },
    });

    const members = await this.prisma.communityGroupMember.findMany({
      where: { groupId, status: 'ACTIVE' },
      select: { userId: true },
    });

    await Promise.all(
      members
        .filter((m) => m.userId !== userId)
        .map((m) =>
          this.notifications.create(
            m.userId,
            NotificationType.COMMUNITY_ANNOUNCEMENT,
            dto.title,
            dto.body.slice(0, 120),
            { groupId, announcementId: announcement.id },
          ),
        ),
    );

    const mapped = mapAnnouncement(announcement);
    void this.events.emitAnnouncement(groupId, mapped);
    return mapped;
  }

  async list(userId: string, groupId: string) {
    const group = await this.prisma.communityGroup.findFirst({
      where: { id: groupId, deletedAt: null },
    });
    if (!group) throw new NotFoundException('Group not found');

    const rows = await this.prisma.communityAnnouncement.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: userSummarySelect } },
    });
    return rows.map(mapAnnouncement);
  }
}
