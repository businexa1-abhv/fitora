import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityFeedItemType,
  CommunityGroupType,
  CommunityJoinRequestStatus,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityPrivacy,
  EnrollmentStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunityEventsService } from '../realtime/community-events.service';
import {
  CreateGroupDto,
  HomeQueryDto,
  JoinGroupDto,
  MemberActionDto,
  NearbyGroupsQueryDto,
  ReviewJoinRequestDto,
  TransferOwnershipDto,
  UpdateGroupDto,
} from './dto/community.dto';
import { CommunityFeedService } from './community-feed.service';
import { CommunityMatchesService } from './community-matches.service';
import { CommunityFriendsService } from './community-friends.service';
import {
  isModeratorRole,
  mapGroupDetail,
  mapGroupSummary,
  mapUserSummary,
  slugifyGroupName,
  userSummarySelect,
} from './community.mapper';

@Injectable()
export class CommunityGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly feed: CommunityFeedService,
    private readonly matches: CommunityMatchesService,
    private readonly friends: CommunityFriendsService,
    private readonly events: CommunityEventsService,
  ) {}

  async getHome(userId: string, query: HomeQueryDto) {
    const city = query.city;
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      myGroups,
      nearbyGroups,
      todaysMatches,
      upcomingMatches,
      needPlayers,
      recentAnnouncements,
      trendingCommunities,
      suggestedGroups,
      feed,
      nearbyCourts,
      friendsPlayingNow,
    ] = await Promise.all([
      this.listMine(userId),
      this.listNearby(userId, { city, page: 1, pageSize: query.pageSize ?? 10 }),
      this.matches.listForUser(userId, { from: startOfDay, to: endOfDay }),
      this.matches.listForUser(userId, { from: endOfDay, limit: 10 }),
      this.matches.listNeedPlayers(userId, 10),
      this.prisma.communityAnnouncement.findMany({
        where: { deletedAt: null, group: { deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { author: { select: userSummarySelect } },
      }),
      this.listTrending(userId),
      this.suggestGroups(userId, city),
      this.feed.getFeed(query.pageSize ?? 20),
      this.prisma.court.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        },
        take: 10,
        select: { id: true, name: true, city: true, sport: { select: { name: true } } },
      }),
      this.friends.getPlayingNow(userId),
    ]);

    return {
      nearbyGroups: nearbyGroups.items,
      myGroups,
      todaysMatches,
      upcomingMatches,
      needPlayers,
      recentAnnouncements: recentAnnouncements.map((a) => ({
        id: a.id,
        groupId: a.groupId,
        type: a.type,
        title: a.title,
        body: a.body,
        pinned: a.pinned,
        createdAt: a.createdAt.toISOString(),
        author: {
          id: a.author.id,
          firstName: a.author.firstName,
          lastName: a.author.lastName,
          avatarUrl: a.author.avatarUrl,
        },
      })),
      nearbyCourts: nearbyCourts.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        sportName: c.sport?.name ?? null,
      })),
      friendsPlayingNow,
      trendingCommunities,
      suggestedGroups,
      feed,
    };
  }

  async createGroup(
    userId: string,
    dto: CreateGroupDto,
    opts?: { tenantId?: string; trainingBatchId?: string },
  ) {
    const slug = `${slugifyGroupName(dto.name)}-${randomUUID().slice(0, 8)}`;

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityGroup.create({
        data: {
          ownerId: userId,
          name: dto.name,
          slug,
          groupType: dto.groupType,
          privacy: dto.privacy ?? CommunityPrivacy.PUBLIC,
          skillLevel: dto.skillLevel,
          maxPlayers: dto.maxPlayers ?? 20,
          sportId: dto.sportId,
          locationLabel: dto.locationLabel,
          city: dto.city,
          homeCourtId: dto.homeCourtId,
          description: dto.description,
          rules: dto.rules,
          coverPhotoUrl: dto.coverPhotoUrl,
          emoji: dto.emoji,
          playingDays: dto.playingDays ?? [],
          playingWindows: dto.playingWindows ?? [],
          latitude: dto.latitude,
          longitude: dto.longitude,
          tenantId: opts?.tenantId,
          trainingBatchId: opts?.trainingBatchId,
          memberCount: 1,
          members: {
            create: {
              userId,
              role: CommunityMemberRole.OWNER,
              status: CommunityMemberStatus.ACTIVE,
            },
          },
        },
        include: {
          owner: { select: userSummarySelect },
          members: { where: { userId } },
        },
      });

      await tx.communityFeedItem.create({
        data: {
          type: CommunityFeedItemType.NEW_GROUP,
          title: `New group: ${created.name}`,
          body: created.description,
          groupId: created.id,
          authorId: userId,
        },
      });

      return created;
    });

    return mapGroupDetail(group, userId);
  }

  async createOwnerGroup(userId: string, dto: CreateGroupDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new BadRequestException('No tenant found for court owner');
    return this.createGroup(
      userId,
      { ...dto, groupType: dto.groupType ?? CommunityGroupType.PUBLIC },
      { tenantId: tenant.id },
    );
  }

  async createBatchGroup(userId: string, trainingBatchId: string, dto: CreateGroupDto) {
    const batch = await this.prisma.trainingBatch.findFirst({
      where: { id: trainingBatchId, deletedAt: null },
      include: {
        communityGroup: { select: { id: true } },
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE, deletedAt: null },
          include: { kid: { select: { parentId: true } } },
        },
      },
    });
    if (!batch) throw new NotFoundException('Training batch not found');
    if (batch.trainerId !== userId) throw new ForbiddenException('Not your training batch');
    if (batch.communityGroup) throw new BadRequestException('Batch already has a community group');

    const group = await this.createGroup(
      userId,
      {
        ...dto,
        name: dto.name || batch.name,
        groupType: CommunityGroupType.ACADEMY_BATCH,
        maxPlayers: dto.maxPlayers ?? batch.maxCapacity,
      },
      { trainingBatchId },
    );

    const parentIds = [
      ...new Set(
        batch.enrollments
          .map((enrollment) => enrollment.kid?.parentId)
          .filter((id): id is string => typeof id === 'string' && id !== userId),
      ),
    ];

    if (parentIds.length > 0) {
      await this.prisma.communityGroupMember.createMany({
        data: parentIds.map((parentId) => ({
          groupId: group.id,
          userId: parentId,
          role: CommunityMemberRole.MEMBER,
          status: CommunityMemberStatus.ACTIVE,
        })),
        skipDuplicates: true,
      });
      const memberCount = await this.prisma.communityGroupMember.count({
        where: { groupId: group.id, status: CommunityMemberStatus.ACTIVE },
      });
      await this.prisma.communityGroup.update({
        where: { id: group.id },
        data: { memberCount },
      });
    }

    return this.getGroup(userId, group.id);
  }

  async listMine(userId: string) {
    const memberships = await this.prisma.communityGroupMember.findMany({
      where: {
        userId,
        status: CommunityMemberStatus.ACTIVE,
        group: { deletedAt: null },
      },
      include: {
        group: {
          include: {
            members: { where: { userId } },
          },
        },
      },
      orderBy: { group: { lastActivityAt: 'desc' } },
    });
    return memberships.map((m) => mapGroupSummary(m.group, userId));
  }

  async getFeedPage(page = 1, pageSize = 20) {
    const take = Math.min(50, Math.max(1, pageSize));
    const skip = (Math.max(1, page) - 1) * take;
    const rows = await this.prisma.communityFeedItem.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { author: { select: userSummarySelect } },
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      imageUrl: row.imageUrl,
      groupId: row.groupId,
      createdAt: row.createdAt.toISOString(),
      author: row.author
        ? {
            id: row.author.id,
            firstName: row.author.firstName,
            lastName: row.author.lastName,
            avatarUrl: row.author.avatarUrl,
          }
        : null,
    }));
  }

  async listNearby(userId: string, query: NearbyGroupsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CommunityGroupWhereInput = {
      deletedAt: null,
      privacy: CommunityPrivacy.PUBLIC,
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.communityGroup.count({ where }),
      this.prisma.communityGroup.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { lastActivityAt: 'desc' },
        include: { members: { where: { userId } } },
      }),
    ]);

    return {
      items: rows.map((g) => mapGroupSummary(g, userId)),
      total,
      page,
      pageSize,
    };
  }

  async listTrending(userId?: string) {
    const rows = await this.prisma.communityGroup.findMany({
      where: { deletedAt: null, isTrending: true },
      orderBy: { lastActivityAt: 'desc' },
      take: 20,
      include: userId ? { members: { where: { userId } } } : undefined,
    });
    return rows.map((g) => mapGroupSummary(g, userId));
  }

  private async suggestGroups(userId: string, city?: string) {
    const rows = await this.prisma.communityGroup.findMany({
      where: {
        deletedAt: null,
        privacy: CommunityPrivacy.PUBLIC,
        members: { none: { userId, status: CommunityMemberStatus.ACTIVE } },
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ memberCount: 'desc' }, { lastActivityAt: 'desc' }],
      take: 10,
      include: { members: { where: { userId } } },
    });
    return rows.map((g) => mapGroupSummary(g, userId));
  }

  async getGroup(userId: string, groupId: string) {
    const group = await this.prisma.communityGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      include: {
        owner: { select: userSummarySelect },
        members: { where: { userId } },
        matches: {
          where: { deletedAt: null, startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 1,
        },
        _count: {
          select: {
            joinRequests: { where: { status: CommunityJoinRequestStatus.PENDING } },
            announcements: { where: { deletedAt: null } },
            media: true,
          },
        },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    return mapGroupDetail(group, userId);
  }

  async updateGroup(userId: string, groupId: string, dto: UpdateGroupDto) {
    await this.requireModerator(userId, groupId);
    const group = await this.prisma.communityGroup.update({
      where: { id: groupId },
      data: {
        ...dto,
        lastActivityAt: new Date(),
      },
      include: {
        owner: { select: userSummarySelect },
        members: { where: { userId } },
        _count: {
          select: {
            joinRequests: { where: { status: CommunityJoinRequestStatus.PENDING } },
            announcements: { where: { deletedAt: null } },
            media: true,
          },
        },
      },
    });
    return mapGroupDetail(group, userId);
  }

  async deleteGroup(userId: string, groupId: string) {
    const membership = await this.requireModerator(userId, groupId, true);
    if (membership.role !== CommunityMemberRole.OWNER) {
      throw new ForbiddenException('Only the owner can delete the group');
    }
    await this.prisma.communityGroup.update({
      where: { id: groupId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async joinGroup(userId: string, groupId: string, dto: JoinGroupDto) {
    const group = await this.prisma.communityGroup.findFirst({
      where: { id: groupId, deletedAt: null },
    });
    if (!group) throw new NotFoundException('Group not found');

    const existing = await this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing?.status === CommunityMemberStatus.ACTIVE) {
      throw new BadRequestException('Already a member');
    }
    if (existing?.status === CommunityMemberStatus.BANNED) {
      throw new ForbiddenException('You are banned from this group');
    }

    if (group.privacy === CommunityPrivacy.PUBLIC) {
      const member = await this.prisma.$transaction(async (tx) => {
        const m = await tx.communityGroupMember.upsert({
          where: { groupId_userId: { groupId, userId } },
          create: {
            groupId,
            userId,
            role: CommunityMemberRole.MEMBER,
            status: CommunityMemberStatus.ACTIVE,
          },
          update: {
            status: CommunityMemberStatus.ACTIVE,
            role: CommunityMemberRole.MEMBER,
            leftAt: null,
          },
        });
        await tx.communityGroup.update({
          where: { id: groupId },
          data: { memberCount: { increment: existing ? 0 : 1 }, lastActivityAt: new Date() },
        });
        return m;
      });
      return { status: 'joined', member };
    }

    const request = await this.prisma.communityJoinRequest.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: {
        groupId,
        userId,
        message: dto.message,
        status: CommunityJoinRequestStatus.PENDING,
      },
      update: {
        message: dto.message,
        status: CommunityJoinRequestStatus.PENDING,
        reviewedAt: null,
        reviewedById: null,
      },
    });

    const admins = await this.prisma.communityGroupMember.findMany({
      where: {
        groupId,
        status: CommunityMemberStatus.ACTIVE,
        role: {
          in: [CommunityMemberRole.OWNER, CommunityMemberRole.ADMIN, CommunityMemberRole.CO_ADMIN],
        },
      },
    });

    await Promise.all(
      admins.map((a) =>
        this.notifications.create(
          a.userId,
          NotificationType.COMMUNITY_JOIN_REQUEST,
          'New join request',
          `Someone requested to join ${group.name}`,
          { groupId, requestId: request.id },
        ),
      ),
    );

    void this.events.emitJoinRequest(groupId, request);
    return { status: 'pending', requestId: request.id };
  }

  async leaveGroup(userId: string, groupId: string) {
    const membership = await this.getMembership(userId, groupId);
    if (!membership || membership.status !== CommunityMemberStatus.ACTIVE) {
      throw new BadRequestException('Not an active member');
    }
    if (membership.role === CommunityMemberRole.OWNER) {
      throw new BadRequestException('Transfer ownership before leaving');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.communityGroupMember.update({
        where: { id: membership.id },
        data: { status: CommunityMemberStatus.LEFT, leftAt: new Date() },
      });
      await tx.communityGroup.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      });
    });
    return { success: true };
  }

  async listMembers(userId: string, groupId: string) {
    await this.requireMember(userId, groupId);
    const members = await this.prisma.communityGroupMember.findMany({
      where: {
        groupId,
        status: { in: [CommunityMemberStatus.ACTIVE, CommunityMemberStatus.MUTED] },
      },
      include: { user: { select: userSummarySelect } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    return members.map((m) => ({
      ...mapUserSummary(m.user),
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
      mutedUntil: m.mutedUntil?.toISOString() ?? null,
    }));
  }

  async listJoinRequests(userId: string, groupId: string) {
    await this.requireModerator(userId, groupId);
    const rows = await this.prisma.communityJoinRequest.findMany({
      where: { groupId, status: CommunityJoinRequestStatus.PENDING },
      include: { user: { select: userSummarySelect } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      user: mapUserSummary(r.user),
    }));
  }

  async reviewJoinRequest(
    userId: string,
    groupId: string,
    requestId: string,
    action: 'approve' | 'reject' | 'waitlist',
    _dto: ReviewJoinRequestDto,
  ) {
    await this.requireModerator(userId, groupId);
    const request = await this.prisma.communityJoinRequest.findFirst({
      where: { id: requestId, groupId },
      include: { group: true },
    });
    if (!request) throw new NotFoundException('Join request not found');
    if (request.status !== CommunityJoinRequestStatus.PENDING) {
      throw new BadRequestException('Request already reviewed');
    }

    const statusMap = {
      approve: CommunityJoinRequestStatus.APPROVED,
      reject: CommunityJoinRequestStatus.REJECTED,
      waitlist: CommunityJoinRequestStatus.WAITLISTED,
    } as const;

    const newStatus = statusMap[action];

    await this.prisma.$transaction(async (tx) => {
      await tx.communityJoinRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });

      if (action === 'approve') {
        await tx.communityGroupMember.upsert({
          where: { groupId_userId: { groupId, userId: request.userId } },
          create: {
            groupId,
            userId: request.userId,
            role: CommunityMemberRole.MEMBER,
            status: CommunityMemberStatus.ACTIVE,
          },
          update: { status: CommunityMemberStatus.ACTIVE, leftAt: null },
        });
        await tx.communityGroup.update({
          where: { id: groupId },
          data: { memberCount: { increment: 1 }, lastActivityAt: new Date() },
        });
      }
    });

    const notifType =
      action === 'approve'
        ? NotificationType.COMMUNITY_JOIN_APPROVED
        : NotificationType.COMMUNITY_JOIN_REJECTED;

    await this.notifications.create(
      request.userId,
      notifType,
      action === 'approve' ? 'Join request approved' : 'Join request update',
      action === 'approve'
        ? `You were approved to join ${request.group.name}`
        : `Your request to join ${request.group.name} was ${action === 'reject' ? 'rejected' : 'waitlisted'}`,
      { groupId, requestId },
    );

    return { success: true, status: newStatus };
  }

  async memberAction(
    userId: string,
    groupId: string,
    targetUserId: string,
    action: 'promote' | 'demote' | 'remove' | 'mute',
    dto: MemberActionDto,
  ) {
    const actor = await this.requireModerator(userId, groupId);
    const target = await this.getMembership(targetUserId, groupId);
    if (!target || target.status !== CommunityMemberStatus.ACTIVE) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === CommunityMemberRole.OWNER) {
      throw new ForbiddenException('Cannot modify the owner');
    }
    if (targetUserId === userId && action !== 'mute') {
      throw new BadRequestException('Cannot perform this action on yourself');
    }

    switch (action) {
      case 'promote': {
        const nextRole =
          target.role === CommunityMemberRole.MEMBER
            ? CommunityMemberRole.MODERATOR
            : target.role === CommunityMemberRole.MODERATOR
              ? CommunityMemberRole.CO_ADMIN
              : CommunityMemberRole.ADMIN;
        if (actor.role !== CommunityMemberRole.OWNER && nextRole === CommunityMemberRole.ADMIN) {
          throw new ForbiddenException('Only owner can promote to admin');
        }
        await this.prisma.communityGroupMember.update({
          where: { id: target.id },
          data: { role: nextRole },
        });
        break;
      }
      case 'demote': {
        const nextRole =
          target.role === CommunityMemberRole.ADMIN
            ? CommunityMemberRole.CO_ADMIN
            : target.role === CommunityMemberRole.CO_ADMIN
              ? CommunityMemberRole.MODERATOR
              : CommunityMemberRole.MEMBER;
        await this.prisma.communityGroupMember.update({
          where: { id: target.id },
          data: { role: nextRole },
        });
        break;
      }
      case 'remove':
        await this.prisma.$transaction(async (tx) => {
          await tx.communityGroupMember.update({
            where: { id: target.id },
            data: { status: CommunityMemberStatus.LEFT, leftAt: new Date() },
          });
          await tx.communityGroup.update({
            where: { id: groupId },
            data: { memberCount: { decrement: 1 } },
          });
        });
        break;
      case 'mute': {
        const hours = dto.muteHours ?? 24;
        await this.prisma.communityGroupMember.update({
          where: { id: target.id },
          data: {
            status: CommunityMemberStatus.MUTED,
            mutedUntil: new Date(Date.now() + hours * 60 * 60 * 1000),
          },
        });
        break;
      }
    }

    return { success: true };
  }

  async transferOwnership(userId: string, groupId: string, dto: TransferOwnershipDto) {
    const owner = await this.requireModerator(userId, groupId, true);
    if (owner.role !== CommunityMemberRole.OWNER) {
      throw new ForbiddenException('Only owner can transfer ownership');
    }

    const newOwner = await this.getMembership(dto.newOwnerId, groupId);
    if (!newOwner || newOwner.status !== CommunityMemberStatus.ACTIVE) {
      throw new BadRequestException('New owner must be an active member');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.communityGroupMember.update({
        where: { id: owner.id },
        data: { role: CommunityMemberRole.ADMIN },
      });
      await tx.communityGroupMember.update({
        where: { id: newOwner.id },
        data: { role: CommunityMemberRole.OWNER },
      });
      await tx.communityGroup.update({
        where: { id: groupId },
        data: { ownerId: dto.newOwnerId },
      });
    });

    return { success: true };
  }

  async getMembership(userId: string, groupId: string) {
    return this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  private async requireMember(userId: string, groupId: string) {
    const m = await this.getMembership(userId, groupId);
    if (!m || m.status !== CommunityMemberStatus.ACTIVE) {
      throw new ForbiddenException('Group membership required');
    }
    return m;
  }

  private async requireModerator(userId: string, groupId: string, allowOwnerOnly = false) {
    const m = await this.getMembership(userId, groupId);
    if (!m || m.status !== CommunityMemberStatus.ACTIVE) {
      throw new ForbiddenException('Group membership required');
    }
    if (!isModeratorRole(m.role)) {
      throw new ForbiddenException('Moderator access required');
    }
    return m;
  }
}
