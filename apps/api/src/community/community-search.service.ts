import { Injectable } from '@nestjs/common';
import { CommunityPrivacy } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { SearchQueryDto } from './dto/community.dto';
import { CommunityFriendsService } from './community-friends.service';
import { mapGroupSummary, mapUserSummary, userSummarySelect } from './community.mapper';

@Injectable()
export class CommunitySearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: CommunityFriendsService,
  ) {}

  async search(userId: string, query: SearchQueryDto) {
    const q = query.q.trim();
    const blockedIds = await this.friends.getBlockedUserIds(userId);
    const pageSize = query.pageSize ?? 20;

    const [groups, players, venues, sports, friendRows] = await Promise.all([
      this.prisma.communityGroup.findMany({
        where: {
          deletedAt: null,
          privacy: CommunityPrivacy.PUBLIC,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { locationLabel: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: pageSize,
        include: { members: { where: { userId } } },
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          id: { notIn: [userId, ...blockedIds] },
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: pageSize,
        select: userSummarySelect,
      }),
      this.prisma.court.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: pageSize,
        select: { id: true, name: true, city: true },
      }),
      this.prisma.sport.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: pageSize,
        select: { id: true, name: true, slug: true },
      }),
      this.friends.list(userId),
    ]);

    const friends = friendRows
      .filter((f) => {
        const name = `${f.user.firstName} ${f.user.lastName}`.toLowerCase();
        return name.includes(q.toLowerCase());
      })
      .slice(0, pageSize)
      .map((f) => f.user);

    return {
      groups: groups.map((g) => mapGroupSummary(g, userId)),
      players: players.map(mapUserSummary),
      venues,
      sports,
      friends,
    };
  }
}
