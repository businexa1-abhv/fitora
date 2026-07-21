import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunityMemberStatus, CommunityMessageType, CommunityPollStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CommunityEventsService } from '../realtime/community-events.service';
import { isModeratorRole, userSummarySelect } from './community.mapper';
import { CreatePollDto, VotePollDto } from './dto/community.dto';

@Injectable()
export class CommunitySocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CommunityEventsService,
  ) {}

  async listMedia(userId: string, groupId: string) {
    await this.requireMember(userId, groupId);
    const rows = await this.prisma.communityMedia.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const uploaders = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.uploadedById))] } },
      select: userSummarySelect,
    });
    const byId = new Map(uploaders.map((u) => [u.id, u]));
    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      mimeType: row.mimeType,
      kind: row.kind,
      caption: row.caption,
      createdAt: row.createdAt.toISOString(),
      author: byId.get(row.uploadedById) ?? {
        id: row.uploadedById,
        firstName: 'Member',
        lastName: '',
        avatarUrl: null,
      },
    }));
  }

  async addMedia(
    userId: string,
    groupId: string,
    dto: { url: string; mimeType: string; kind?: string; caption?: string; matchId?: string },
  ) {
    await this.requireMember(userId, groupId);
    const row = await this.prisma.communityMedia.create({
      data: {
        groupId,
        matchId: dto.matchId,
        uploadedById: userId,
        url: dto.url,
        mimeType: dto.mimeType,
        kind: dto.kind ?? 'IMAGE',
        caption: dto.caption,
      },
    });
    await this.prisma.communityGroup.update({
      where: { id: groupId },
      data: { lastActivityAt: new Date() },
    });
    return {
      id: row.id,
      url: row.url,
      mimeType: row.mimeType,
      kind: row.kind,
      caption: row.caption,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listPolls(userId: string, groupId: string) {
    await this.requireMember(userId, groupId);
    const polls = await this.prisma.communityPoll.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        options: { orderBy: { sortOrder: 'asc' }, include: { votes: true } },
        votes: { where: { userId } },
      },
    });
    return polls.map((poll) => this.mapPoll(poll, userId));
  }

  async createPoll(userId: string, groupId: string, dto: CreatePollDto) {
    await this.requireModerator(userId, groupId);
    const options = (dto.options ?? []).map((label) => label.trim()).filter(Boolean);
    if (options.length < 2) throw new BadRequestException('Poll needs at least 2 options');

    const message = await this.prisma.communityMessage.create({
      data: {
        groupId,
        authorId: userId,
        type: CommunityMessageType.POLL,
        body: dto.question,
      },
    });

    const poll = await this.prisma.communityPoll.create({
      data: {
        groupId,
        messageId: message.id,
        question: dto.question,
        status: CommunityPollStatus.OPEN,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        options: {
          create: options.map((label, index) => ({ label, sortOrder: index })),
        },
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' }, include: { votes: true } },
        votes: { where: { userId } },
      },
    });

    await this.events.emitMessage(groupId, {
      id: message.id,
      type: CommunityMessageType.POLL,
      body: dto.question,
      pollId: poll.id,
    });

    return this.mapPoll(poll, userId);
  }

  async votePoll(userId: string, pollId: string, dto: VotePollDto) {
    const poll = await this.prisma.communityPoll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll) throw new NotFoundException('Poll not found');
    await this.requireMember(userId, poll.groupId);
    if (poll.status !== CommunityPollStatus.OPEN) {
      throw new BadRequestException('Poll is closed');
    }
    if (poll.closesAt && poll.closesAt.getTime() < Date.now()) {
      throw new BadRequestException('Poll has ended');
    }
    if (!poll.options.some((o) => o.id === dto.optionId)) {
      throw new BadRequestException('Invalid poll option');
    }

    await this.prisma.communityPollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      create: { pollId, optionId: dto.optionId, userId },
      update: { optionId: dto.optionId },
    });

    const refreshed = await this.prisma.communityPoll.findUniqueOrThrow({
      where: { id: pollId },
      include: {
        options: { orderBy: { sortOrder: 'asc' }, include: { votes: true } },
        votes: { where: { userId } },
      },
    });
    return this.mapPoll(refreshed, userId);
  }

  async listLeaderboard(userId: string, groupId: string) {
    await this.requireMember(userId, groupId);
    let rows = await this.prisma.communityLeaderboardEntry.findMany({
      where: { groupId },
      orderBy: [{ points: 'desc' }, { wins: 'desc' }],
      take: 50,
    });

    if (rows.length === 0) {
      rows = await this.rebuildLeaderboard(groupId);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: userSummarySelect,
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return rows.map((row, index) => ({
      rank: index + 1,
      user: byId.get(row.userId) ?? {
        id: row.userId,
        firstName: 'Player',
        lastName: '',
        avatarUrl: null,
      },
      points: row.points,
      wins: row.wins,
      matchesPlayed: row.matchesPlayed,
      participationPct: Number(row.participationPct),
    }));
  }

  private async rebuildLeaderboard(groupId: string) {
    const players = await this.prisma.communityMatchPlayer.findMany({
      where: {
        match: { groupId, deletedAt: null },
        rsvp: { in: ['COMING', 'LATE', 'BRING_SHUTTLE', 'BRING_BALL', 'NEED_RACQUET'] },
      },
      select: { userId: true, matchId: true },
    });

    const byUser = new Map<string, { matchesPlayed: number }>();
    for (const p of players) {
      const current = byUser.get(p.userId) ?? { matchesPlayed: 0 };
      current.matchesPlayed += 1;
      byUser.set(p.userId, current);
    }

    const data = [...byUser.entries()].map(([userId, stats]) => ({
      groupId,
      userId,
      matchesPlayed: stats.matchesPlayed,
      points: stats.matchesPlayed * 10,
      wins: 0,
      participationPct: 0,
    }));

    if (data.length === 0) return [];

    await this.prisma.$transaction(
      data.map((row) =>
        this.prisma.communityLeaderboardEntry.upsert({
          where: { groupId_userId: { groupId, userId: row.userId } },
          create: row,
          update: {
            matchesPlayed: row.matchesPlayed,
            points: row.points,
          },
        }),
      ),
    );

    return this.prisma.communityLeaderboardEntry.findMany({
      where: { groupId },
      orderBy: [{ points: 'desc' }, { wins: 'desc' }],
      take: 50,
    });
  }

  private mapPoll(
    poll: {
      id: string;
      question: string;
      status: CommunityPollStatus;
      closesAt: Date | null;
      options: Array<{ id: string; label: string; votes: Array<{ userId: string }> }>;
      votes: Array<{ optionId: string }>;
    },
    userId: string,
  ) {
    const myVote = poll.votes[0]?.optionId ?? null;
    return {
      id: poll.id,
      question: poll.question,
      status: poll.status,
      endsAt: poll.closesAt?.toISOString() ?? null,
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        voteCount: option.votes.length,
        votedByMe: myVote === option.id,
      })),
    };
  }

  private async requireMember(userId: string, groupId: string) {
    const membership = await this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || membership.status !== CommunityMemberStatus.ACTIVE) {
      throw new ForbiddenException('Group membership required');
    }
    return membership;
  }

  private async requireModerator(userId: string, groupId: string) {
    const membership = await this.requireMember(userId, groupId);
    if (!isModeratorRole(membership.role)) {
      throw new ForbiddenException('Moderator access required');
    }
    return membership;
  }
}
