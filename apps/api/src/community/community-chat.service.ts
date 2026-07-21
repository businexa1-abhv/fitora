import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityFriendshipStatus,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityMessageType,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunityEventsService } from '../realtime/community-events.service';
import { MessagesQueryDto, SendMessageDto } from './dto/community.dto';
import { isModeratorRole, mapMessage, userSummarySelect } from './community.mapper';

@Injectable()
export class CommunityChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: CommunityEventsService,
  ) {}

  async listMessages(userId: string, groupId: string, query: MessagesQueryDto) {
    await this.ensureCanRead(userId, groupId);
    const limit = query.limit ?? 50;
    const rows = await this.prisma.communityMessage.findMany({
      where: {
        groupId,
        deletedAt: null,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: userSummarySelect },
        reactions: true,
        pins: true,
        replyTo: { include: { author: { select: userSummarySelect } } },
      },
    });
    return rows.reverse().map((m) => mapMessage(m, userId));
  }

  async sendMessage(userId: string, groupId: string, dto: SendMessageDto) {
    const membership = await this.ensureCanWrite(userId, groupId);
    if (membership.status === CommunityMemberStatus.MUTED) {
      if (membership.mutedUntil && membership.mutedUntil > new Date()) {
        throw new ForbiddenException('You are muted in this group');
      }
    }

    const message = await this.prisma.communityMessage.create({
      data: {
        groupId,
        authorId: userId,
        type: dto.type ?? CommunityMessageType.TEXT,
        body: dto.body,
        mediaUrl: dto.mediaUrl,
        mediaMimeType: dto.mediaMimeType,
        replyToId: dto.replyToId,
        mentionUserIds: dto.mentionUserIds ?? [],
      },
      include: {
        author: { select: userSummarySelect },
        reactions: true,
        pins: true,
        replyTo: { include: { author: { select: userSummarySelect } } },
      },
    });

    await this.prisma.communityGroup.update({
      where: { id: groupId },
      data: { lastActivityAt: new Date() },
    });

    const mapped = mapMessage(message, userId);
    void this.events.emitMessage(groupId, mapped);

    if (dto.mentionUserIds?.length) {
      await Promise.all(
        dto.mentionUserIds
          .filter((id) => id !== userId)
          .map((mentionedId) =>
            this.notifications.create(
              mentionedId,
              NotificationType.COMMUNITY_MENTION,
              'You were mentioned',
              dto.body?.slice(0, 120) ?? 'New mention',
              { groupId, messageId: message.id },
            ),
          ),
      );
    }

    return mapped;
  }

  async react(userId: string, messageId: string, emoji: string) {
    const message = await this.findMessage(messageId);
    await this.ensureCanWrite(userId, message.groupId);

    const reaction = await this.prisma.communityMessageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });

    void this.events.emitReaction(message.groupId, messageId, reaction);
    return { success: true };
  }

  async unreact(userId: string, messageId: string, emoji: string) {
    const message = await this.findMessage(messageId);
    await this.ensureCanWrite(userId, message.groupId);
    await this.prisma.communityMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    return { success: true };
  }

  async pinMessage(userId: string, messageId: string) {
    const message = await this.findMessage(messageId);
    const membership = await this.ensureCanWrite(userId, message.groupId);
    if (!isModeratorRole(membership.role)) {
      throw new ForbiddenException('Moderator access required to pin messages');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.communityPinnedMessage.upsert({
        where: { groupId_messageId: { groupId: message.groupId, messageId } },
        create: { groupId: message.groupId, messageId, pinnedById: userId },
        update: { pinnedAt: new Date(), pinnedById: userId },
      });
      await tx.communityMessage.update({
        where: { id: messageId },
        data: { isPinned: true },
      });
    });

    return { success: true };
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.findMessage(messageId);
    const membership = await this.getMembership(userId, message.groupId);
    const isAuthor = message.authorId === userId;
    const isMod = membership && isModeratorRole(membership.role);

    if (!isAuthor && !isMod) {
      throw new ForbiddenException('Cannot delete this message');
    }

    await this.prisma.communityMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async markRead(userId: string, messageId: string) {
    const message = await this.findMessage(messageId);
    await this.ensureCanRead(userId, message.groupId);
    await this.prisma.communityMessageReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, readAt: new Date(), deliveredAt: new Date() },
      update: { readAt: new Date() },
    });
    return { success: true };
  }

  private async findMessage(messageId: string) {
    const message = await this.prisma.communityMessage.findFirst({
      where: { id: messageId, deletedAt: null },
    });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  private async getMembership(userId: string, groupId: string) {
    return this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  private async ensureCanRead(userId: string, groupId: string) {
    const group = await this.prisma.communityGroup.findFirst({
      where: { id: groupId, deletedAt: null },
    });
    if (!group) throw new NotFoundException('Group not found');

    if (group.privacy === 'PUBLIC') return null;

    const m = await this.getMembership(userId, groupId);
    if (!m || m.status !== CommunityMemberStatus.ACTIVE) {
      throw new ForbiddenException('Group membership required');
    }
    return m;
  }

  private async ensureCanWrite(userId: string, groupId: string) {
    const m = await this.getMembership(userId, groupId);
    if (!m || m.status !== CommunityMemberStatus.ACTIVE) {
      throw new ForbiddenException('Active membership required');
    }
    return m;
  }
}
