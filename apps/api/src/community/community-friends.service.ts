import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunityFriendshipStatus, CommunityMatchStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { BlockDto, FriendRequestDto } from './dto/community.dto';
import { mapUserSummary, userSummarySelect } from './community.mapper';

@Injectable()
export class CommunityFriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async sendRequest(userId: string, dto: FriendRequestDto) {
    if (userId === dto.userId) throw new BadRequestException('Cannot friend yourself');

    const blocked = await this.isBlockedEitherWay(userId, dto.userId);
    if (blocked) throw new ForbiddenException('Unable to send friend request');

    const existing = await this.prisma.communityFriendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: dto.userId },
          { requesterId: dto.userId, addresseeId: userId },
        ],
      },
    });

    if (existing?.status === CommunityFriendshipStatus.ACCEPTED) {
      throw new BadRequestException('Already friends');
    }
    if (existing?.status === CommunityFriendshipStatus.PENDING) {
      throw new BadRequestException('Friend request already pending');
    }

    const friendship = await this.prisma.communityFriendship.create({
      data: {
        requesterId: userId,
        addresseeId: dto.userId,
        status: CommunityFriendshipStatus.PENDING,
      },
      include: { addressee: { select: userSummarySelect } },
    });

    await this.notifications.create(
      dto.userId,
      NotificationType.COMMUNITY_FRIEND_REQUEST,
      'New friend request',
      'Someone wants to connect with you',
      { friendshipId: friendship.id, requesterId: userId },
    );

    return {
      id: friendship.id,
      status: friendship.status,
      user: mapUserSummary(friendship.addressee),
      createdAt: friendship.createdAt.toISOString(),
    };
  }

  async accept(userId: string, friendshipId: string) {
    const friendship = await this.findPendingForAddressee(userId, friendshipId);
    const updated = await this.prisma.communityFriendship.update({
      where: { id: friendshipId },
      data: { status: CommunityFriendshipStatus.ACCEPTED },
      include: { requester: { select: userSummarySelect } },
    });
    return {
      id: updated.id,
      status: updated.status,
      user: mapUserSummary(updated.requester),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async decline(userId: string, friendshipId: string) {
    const friendship = await this.findPendingForAddressee(userId, friendshipId);
    await this.prisma.communityFriendship.update({
      where: { id: friendship.id },
      data: { status: CommunityFriendshipStatus.DECLINED },
    });
    return { success: true };
  }

  async list(userId: string) {
    const rows = await this.prisma.communityFriendship.findMany({
      where: {
        status: CommunityFriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: userSummarySelect },
        addressee: { select: userSummarySelect },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((f) => {
      const user = f.requesterId === userId ? f.addressee : f.requester;
      return {
        id: f.id,
        status: f.status,
        user: mapUserSummary(user),
        createdAt: f.createdAt.toISOString(),
      };
    });
  }

  async listPending(userId: string) {
    const rows = await this.prisma.communityFriendship.findMany({
      where: { addresseeId: userId, status: CommunityFriendshipStatus.PENDING },
      include: { requester: { select: userSummarySelect } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((f) => ({
      id: f.id,
      status: f.status,
      user: mapUserSummary(f.requester),
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async nearby(userId: string, _city?: string) {
    const blockedIds = await this.getBlockedUserIds(userId);

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        id: { notIn: [userId, ...blockedIds] },
      },
      take: 30,
      select: userSummarySelect,
    });
    return users.map(mapUserSummary);
  }

  async playingToday(userId: string) {
    const friendIds = await this.getFriendIds(userId);
    if (friendIds.length === 0) return [];

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const players = await this.prisma.communityMatchPlayer.findMany({
      where: {
        userId: { in: friendIds },
        rsvp: 'COMING',
        match: {
          deletedAt: null,
          startsAt: { gte: start, lte: end },
          status: {
            in: [
              CommunityMatchStatus.WAITING_PLAYERS,
              CommunityMatchStatus.CONFIRMED,
              CommunityMatchStatus.FULL,
            ],
          },
        },
      },
      distinct: ['userId'],
      include: { user: { select: userSummarySelect } },
    });

    return players.map((p) => mapUserSummary(p.user));
  }

  async getPlayingNow(userId: string) {
    return this.playingToday(userId);
  }

  async block(userId: string, dto: BlockDto) {
    if (userId === dto.userId) throw new BadRequestException('Cannot block yourself');

    await this.prisma.communityBlock.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: dto.userId } },
      create: { blockerId: userId, blockedId: dto.userId, reason: dto.reason },
      update: { reason: dto.reason },
    });

    await this.prisma.communityFriendship.updateMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: dto.userId },
          { requesterId: dto.userId, addresseeId: userId },
        ],
      },
      data: { status: CommunityFriendshipStatus.BLOCKED },
    });

    return { success: true };
  }

  async getBlockedUserIds(userId: string) {
    const rows = await this.prisma.communityBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    return rows.flatMap((r) => (r.blockerId === userId ? r.blockedId : r.blockerId));
  }

  private async getFriendIds(userId: string) {
    const rows = await this.prisma.communityFriendship.findMany({
      where: {
        status: CommunityFriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });
    return rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
  }

  private async isBlockedEitherWay(a: string, b: string) {
    const block = await this.prisma.communityBlock.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return !!block;
  }

  private async findPendingForAddressee(userId: string, friendshipId: string) {
    const friendship = await this.prisma.communityFriendship.findFirst({
      where: { id: friendshipId, addresseeId: userId, status: CommunityFriendshipStatus.PENDING },
    });
    if (!friendship) throw new NotFoundException('Friend request not found');
    return friendship;
  }
}
