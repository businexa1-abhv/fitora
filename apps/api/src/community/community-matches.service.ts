import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityFeedItemType,
  CommunityMatchStatus,
  CommunityMemberStatus,
  CommunityRsvpStatus,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunityEventsService } from '../realtime/community-events.service';
import {
  CheckInDto,
  CreateMatchDto,
  CreateMatchFromBookingDto,
  RsvpDto,
} from './dto/community.dto';
import { CommunityFeedService } from './community-feed.service';
import { mapMatchDetail, mapMatchSummary, userSummarySelect } from './community.mapper';

const REMINDER_OFFSETS_MINUTES = [24 * 60, 2 * 60, 30, 15];

@Injectable()
export class CommunityMatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly feed: CommunityFeedService,
    private readonly events: CommunityEventsService,
  ) {}

  async createMatch(userId: string, dto: CreateMatchDto) {
    await this.ensureActiveMember(userId, dto.groupId);
    const startsAt = new Date(dto.startsAt);

    const match = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityMatch.create({
        data: {
          groupId: dto.groupId,
          createdById: userId,
          title: dto.title,
          venueLabel: dto.venueLabel,
          courtId: dto.courtId,
          bookingId: dto.bookingId,
          startsAt,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          requiredPlayers: dto.requiredPlayers ?? 4,
          skillLevel: dto.skillLevel,
          entryFee: dto.entryFee ?? 0,
          shuttleIncluded: dto.shuttleIncluded ?? false,
          ballIncluded: dto.ballIncluded ?? false,
          matchType: dto.matchType,
          status: CommunityMatchStatus.WAITING_PLAYERS,
          needsPlayers: true,
          players: {
            create: {
              userId,
              rsvp: CommunityRsvpStatus.COMING,
              isHost: true,
            },
          },
          confirmedCount: 1,
        },
        include: {
          group: { select: { name: true, emoji: true } },
          players: { include: { user: { select: userSummarySelect } } },
        },
      });

      await tx.communityMatchReminder.createMany({
        data: REMINDER_OFFSETS_MINUTES.map((offsetMinutes) => ({
          matchId: created.id,
          offsetMinutes,
          scheduledFor: new Date(startsAt.getTime() - offsetMinutes * 60 * 1000),
        })),
      });

      await tx.communityGroup.update({
        where: { id: dto.groupId },
        data: { lastActivityAt: new Date() },
      });

      return created;
    });

    const members = await this.prisma.communityGroupMember.findMany({
      where: { groupId: dto.groupId, status: CommunityMemberStatus.ACTIVE },
      select: { userId: true },
    });

    await Promise.all(
      members
        .filter((m) => m.userId !== userId)
        .map((m) =>
          this.notifications.create(
            m.userId,
            NotificationType.COMMUNITY_NEW_MATCH,
            'New match scheduled',
            dto.title,
            { groupId: dto.groupId, matchId: match.id },
          ),
        ),
    );

    await this.feed.createFeedItem({
      type: CommunityFeedItemType.MATCH,
      title: dto.title,
      groupId: dto.groupId,
      authorId: userId,
    });

    const mapped = mapMatchDetail(match, userId);
    void this.events.emitMatchUpdated(dto.groupId, mapped);
    return mapped;
  }

  async createFromBooking(userId: string, dto: CreateMatchFromBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, userId, deletedAt: null },
      include: { slot: true, court: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const existing = await this.prisma.communityMatch.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) throw new BadRequestException('Match already exists for booking');

    return this.createMatch(userId, {
      groupId: dto.groupId,
      bookingId: dto.bookingId,
      courtId: booking.courtId,
      title: dto.title ?? `Match at ${booking.court.name}`,
      venueLabel: booking.court.name,
      startsAt: booking.slot.startTime.toISOString(),
      endsAt: booking.slot.endTime.toISOString(),
      requiredPlayers: dto.requiredPlayers,
    });
  }

  async getMatch(userId: string, matchId: string) {
    const match = await this.findMatch(matchId);
    return mapMatchDetail(match, userId);
  }

  async updateMatch(userId: string, matchId: string, dto: Partial<CreateMatchDto>) {
    const match = await this.findMatch(matchId);
    await this.ensureHostOrCreator(userId, match);

    const updated = await this.prisma.communityMatch.update({
      where: { id: matchId },
      data: {
        title: dto.title,
        venueLabel: dto.venueLabel,
        courtId: dto.courtId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        requiredPlayers: dto.requiredPlayers,
        skillLevel: dto.skillLevel,
        entryFee: dto.entryFee,
        shuttleIncluded: dto.shuttleIncluded,
        ballIncluded: dto.ballIncluded,
        matchType: dto.matchType,
      },
      include: {
        group: { select: { name: true, emoji: true } },
        players: { include: { user: { select: userSummarySelect } } },
      },
    });

    const mapped = mapMatchDetail(updated, userId);
    void this.events.emitMatchUpdated(updated.groupId, mapped);
    return mapped;
  }

  async rsvp(userId: string, matchId: string, dto: RsvpDto) {
    const match = await this.findMatch(matchId);
    await this.ensureActiveMember(userId, match.groupId);

    const wasComing =
      match.players.find((p) => p.userId === userId)?.rsvp === CommunityRsvpStatus.COMING;

    const player = await this.prisma.communityMatchPlayer.upsert({
      where: { matchId_userId: { matchId, userId } },
      create: { matchId, userId, rsvp: dto.rsvp, note: dto.note },
      update: { rsvp: dto.rsvp, note: dto.note },
      include: { user: { select: userSummarySelect } },
    });

    let confirmedDelta = 0;
    if (dto.rsvp === CommunityRsvpStatus.COMING && !wasComing) confirmedDelta = 1;
    if (dto.rsvp !== CommunityRsvpStatus.COMING && wasComing) confirmedDelta = -1;

    const updated = await this.prisma.communityMatch.update({
      where: { id: matchId },
      data: {
        confirmedCount: { increment: confirmedDelta },
      },
      include: {
        group: { select: { name: true, emoji: true } },
        players: { include: { user: { select: userSummarySelect } } },
      },
    });

    let status = updated.status;
    let needsPlayers = updated.needsPlayers;
    if (updated.confirmedCount >= updated.requiredPlayers) {
      status = CommunityMatchStatus.FULL;
      needsPlayers = false;
    } else if (updated.status === CommunityMatchStatus.FULL) {
      status = CommunityMatchStatus.WAITING_PLAYERS;
      needsPlayers = true;
    }

    const final = await this.prisma.communityMatch.update({
      where: { id: matchId },
      data: { status, needsPlayers },
      include: {
        group: { select: { name: true, emoji: true } },
        players: { include: { user: { select: userSummarySelect } } },
      },
    });

    if (needsPlayers && updated.confirmedCount < updated.requiredPlayers) {
      const members = await this.prisma.communityGroupMember.findMany({
        where: { groupId: match.groupId, status: CommunityMemberStatus.ACTIVE },
        select: { userId: true },
      });
      await Promise.all(
        members
          .slice(0, 20)
          .map((m) =>
            this.notifications.create(
              m.userId,
              NotificationType.COMMUNITY_PLAYER_NEEDED,
              'Players needed',
              `${final.title} needs ${final.requiredPlayers - final.confirmedCount} more`,
              { matchId, groupId: final.groupId },
            ),
          ),
      );
    }

    const mapped = mapMatchDetail(final, userId);
    void this.events.emitMatchUpdated(final.groupId, mapped);
    return { ...mapped, player };
  }

  async startMatch(userId: string, matchId: string) {
    const match = await this.findMatch(matchId);
    await this.ensureHostOrCreator(userId, match);
    const updated = await this.prisma.communityMatch.update({
      where: { id: matchId },
      data: { status: CommunityMatchStatus.LIVE, liveStartedAt: new Date() },
      include: {
        group: { select: { name: true, emoji: true } },
        players: { include: { user: { select: userSummarySelect } } },
      },
    });
    const mapped = mapMatchDetail(updated, userId);
    void this.events.emitMatchUpdated(updated.groupId, mapped);
    return mapped;
  }

  async completeMatch(userId: string, matchId: string) {
    const match = await this.findMatch(matchId);
    await this.ensureHostOrCreator(userId, match);
    const updated = await this.prisma.communityMatch.update({
      where: { id: matchId },
      data: {
        status: CommunityMatchStatus.COMPLETED,
        completedAt: new Date(),
        needsPlayers: false,
      },
      include: {
        group: { select: { name: true, emoji: true } },
        players: { include: { user: { select: userSummarySelect } } },
      },
    });
    const mapped = mapMatchDetail(updated, userId);
    void this.events.emitMatchUpdated(updated.groupId, mapped);
    return mapped;
  }

  async cancelMatch(userId: string, matchId: string, reason?: string) {
    const match = await this.findMatch(matchId);
    await this.ensureHostOrCreator(userId, match);
    const updated = await this.prisma.communityMatch.update({
      where: { id: matchId },
      data: {
        status: CommunityMatchStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
        needsPlayers: false,
      },
      include: {
        group: { select: { name: true, emoji: true } },
        players: { include: { user: { select: userSummarySelect } } },
      },
    });
    const mapped = mapMatchDetail(updated, userId);
    void this.events.emitMatchUpdated(updated.groupId, mapped);
    return mapped;
  }

  async checkIn(userId: string, matchId: string, dto: CheckInDto) {
    const match = await this.findMatch(matchId);
    await this.ensureActiveMember(userId, match.groupId);

    await this.prisma.communityMatchAttendance.upsert({
      where: { matchId_userId: { matchId, userId } },
      create: {
        matchId,
        userId,
        qrPayload: dto.qrPayload,
      },
      update: {
        checkedInAt: new Date(),
        qrPayload: dto.qrPayload,
      },
    });

    await this.prisma.communityMatchPlayer.updateMany({
      where: { matchId, userId },
      data: { checkedInAt: new Date() },
    });

    return { success: true };
  }

  async listNeedPlayers(userId: string, limit = 20) {
    return this.listNeedPlayersInternal(userId, limit);
  }

  async listNeedPlayersInternal(viewerUserId?: string, limit = 20) {
    const rows = await this.prisma.communityMatch.findMany({
      where: {
        deletedAt: null,
        needsPlayers: true,
        startsAt: { gte: new Date() },
        status: { in: [CommunityMatchStatus.WAITING_PLAYERS, CommunityMatchStatus.CONFIRMED] },
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
      include: {
        group: { select: { name: true, emoji: true } },
        ...(viewerUserId ? { players: { where: { userId: viewerUserId }, take: 1 } } : {}),
      },
    });
    return rows.map((m) => mapMatchSummary(m, viewerUserId));
  }

  async listForUser(userId: string, opts: { from?: Date; to?: Date; limit?: number }) {
    const memberships = await this.prisma.communityGroupMember.findMany({
      where: { userId, status: CommunityMemberStatus.ACTIVE },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) return [];

    const rows = await this.prisma.communityMatch.findMany({
      where: {
        deletedAt: null,
        groupId: { in: groupIds },
        ...(opts.from || opts.to
          ? {
              startsAt: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lte: opts.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: opts.limit ?? 50,
      include: {
        group: { select: { name: true, emoji: true } },
        players: { where: { userId }, take: 1 },
      },
    });
    return rows.map((m) => mapMatchSummary(m, userId));
  }

  private async findMatch(matchId: string) {
    const match = await this.prisma.communityMatch.findFirst({
      where: { id: matchId, deletedAt: null },
      include: {
        group: { select: { name: true, emoji: true } },
        players: { include: { user: { select: userSummarySelect } } },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  private async ensureActiveMember(userId: string, groupId: string) {
    const m = await this.prisma.communityGroupMember.findFirst({
      where: { groupId, userId, status: CommunityMemberStatus.ACTIVE },
    });
    if (!m) throw new ForbiddenException('Active group membership required');
    return m;
  }

  private async ensureHostOrCreator(
    userId: string,
    match: { createdById: string; players: { userId: string; isHost: boolean }[] },
  ) {
    if (match.createdById === userId) return;
    const host = match.players.find((p) => p.userId === userId && p.isHost);
    if (!host) throw new ForbiddenException('Only host or creator can perform this action');
  }

  async dispatchDueReminders() {
    const now = new Date();
    const due = await this.prisma.communityMatchReminder.findMany({
      where: {
        sentAt: null,
        scheduledFor: { lte: now },
        match: {
          deletedAt: null,
          status: {
            in: [
              CommunityMatchStatus.WAITING_PLAYERS,
              CommunityMatchStatus.CONFIRMED,
              CommunityMatchStatus.FULL,
              CommunityMatchStatus.LIVE,
            ],
          },
        },
      },
      take: 100,
      include: {
        match: {
          include: {
            group: { select: { name: true, emoji: true } },
            players: {
              where: {
                rsvp: {
                  in: [
                    CommunityRsvpStatus.COMING,
                    CommunityRsvpStatus.MAYBE,
                    CommunityRsvpStatus.LATE,
                    CommunityRsvpStatus.NEED_PICKUP,
                    CommunityRsvpStatus.NEED_PARTNER,
                    CommunityRsvpStatus.BRING_SHUTTLE,
                    CommunityRsvpStatus.BRING_BALL,
                    CommunityRsvpStatus.NEED_RACQUET,
                  ],
                },
              },
              select: { userId: true },
            },
          },
        },
      },
    });

    let sent = 0;
    for (const reminder of due) {
      const label =
        reminder.offsetMinutes >= 1440
          ? '24 hours'
          : reminder.offsetMinutes >= 120
            ? '2 hours'
            : reminder.offsetMinutes >= 30
              ? '30 minutes'
              : '15 minutes';

      for (const player of reminder.match.players) {
        await this.notifications.create(
          player.userId,
          NotificationType.COMMUNITY_MATCH_REMINDER,
          `${reminder.match.group.emoji ?? '🏸'} Match in ${label}`,
          `${reminder.match.title} with ${reminder.match.group.name} starts soon.`,
          {
            path: `community/match/${reminder.matchId}`,
            matchId: reminder.matchId,
            groupId: reminder.match.groupId,
            offsetMinutes: reminder.offsetMinutes,
          },
        );
        sent += 1;
      }

      await this.prisma.communityMatchReminder.update({
        where: { id: reminder.id },
        data: { sentAt: now },
      });
    }

    return { sent, checked: due.length };
  }
}
