import { Injectable } from '@nestjs/common';
import { CommunityFeedItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { mapFeedItem, userSummarySelect } from './community.mapper';

@Injectable()
export class CommunityFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async createFeedItem(data: {
    type: CommunityFeedItemType;
    title: string;
    body?: string | null;
    imageUrl?: string | null;
    groupId?: string | null;
    authorId?: string | null;
    payload?: Prisma.InputJsonValue;
  }) {
    const row = await this.prisma.communityFeedItem.create({
      data: {
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        imageUrl: data.imageUrl ?? null,
        groupId: data.groupId ?? null,
        authorId: data.authorId ?? null,
        payload: data.payload,
      },
      include: { author: { select: userSummarySelect } },
    });
    return mapFeedItem(row);
  }

  async getFeed(limit = 20) {
    const rows = await this.prisma.communityFeedItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { author: { select: userSummarySelect } },
    });
    return rows.map(mapFeedItem);
  }
}
