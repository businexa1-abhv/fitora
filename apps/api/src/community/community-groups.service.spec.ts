import { Test, TestingModule } from '@nestjs/testing';
import {
  CommunityGroupType,
  CommunityJoinRequestStatus,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityPrivacy,
} from '@prisma/client';
import { CommunityGroupsService } from './community-groups.service';
import { PrismaService } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunityFeedService } from './community-feed.service';
import { CommunityMatchesService } from './community-matches.service';
import { CommunityFriendsService } from './community-friends.service';
import { CommunityEventsService } from '../realtime/community-events.service';

describe('CommunityGroupsService', () => {
  let service: CommunityGroupsService;
  let prisma: any;
  let notifications: { create: jest.Mock };

  const userId = 'user-1';
  const groupId = 'group-1';

  beforeEach(async () => {
    prisma = {
      communityGroup: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      communityGroupMember: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      communityJoinRequest: {
        upsert: jest.fn(),
      },
      communityFeedItem: { create: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    notifications = { create: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityGroupsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: CommunityFeedService,
          useValue: { createFeedItem: jest.fn(), getFeed: jest.fn() },
        },
        {
          provide: CommunityMatchesService,
          useValue: { listForUser: jest.fn(), listNeedPlayers: jest.fn() },
        },
        { provide: CommunityFriendsService, useValue: { getPlayingNow: jest.fn() } },
        { provide: CommunityEventsService, useValue: { emitJoinRequest: jest.fn() } },
      ],
    }).compile();

    service = module.get(CommunityGroupsService);
  });

  it('creates a group with owner membership and feed item', async () => {
    const createdGroup = {
      id: groupId,
      name: 'Weekend Smashers',
      slug: 'weekend-smashers-ab12cd34',
      emoji: '🏸',
      coverPhotoUrl: null,
      groupType: CommunityGroupType.BADMINTON,
      privacy: CommunityPrivacy.PUBLIC,
      skillLevel: 'INTERMEDIATE',
      city: 'Bangalore',
      locationLabel: 'Koramangala',
      memberCount: 1,
      ratingAvg: 0,
      isTrending: false,
      lastActivityAt: new Date(),
      description: null,
      rules: null,
      maxPlayers: 20,
      playingDays: [],
      playingWindows: [],
      homeCourtId: null,
      sportId: null,
      tenantId: null,
      owner: { id: userId, firstName: 'A', lastName: 'B', avatarUrl: null },
      members: [{ userId, role: CommunityMemberRole.OWNER, status: CommunityMemberStatus.ACTIVE }],
      matches: [],
      _count: { joinRequests: 0, announcements: 0, media: 0 },
    };

    prisma.communityGroup.create.mockResolvedValue(createdGroup);
    prisma.communityFeedItem.create.mockResolvedValue({ id: 'feed-1' });

    const result = await service.createGroup(userId, {
      name: 'Weekend Smashers',
      groupType: CommunityGroupType.BADMINTON,
      city: 'Bangalore',
    });

    expect(prisma.communityGroup.create).toHaveBeenCalled();
    expect(prisma.communityFeedItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'NEW_GROUP', groupId }),
      }),
    );
    expect(result.name).toBe('Weekend Smashers');
    expect(result.myRole).toBe(CommunityMemberRole.OWNER);
  });

  it('joins a public group immediately as active member', async () => {
    prisma.communityGroup.findFirst.mockResolvedValue({
      id: groupId,
      name: 'Open Group',
      privacy: CommunityPrivacy.PUBLIC,
    });
    prisma.communityGroupMember.findUnique.mockResolvedValue(null);
    prisma.communityGroupMember.upsert.mockResolvedValue({
      id: 'member-1',
      role: CommunityMemberRole.MEMBER,
      status: CommunityMemberStatus.ACTIVE,
    });
    prisma.communityGroup.update.mockResolvedValue({});

    const result = await service.joinGroup(userId, groupId, {});

    expect(result.status).toBe('joined');
    expect(prisma.communityGroupMember.upsert).toHaveBeenCalled();
    expect(prisma.communityJoinRequest.upsert).not.toHaveBeenCalled();
  });

  it('creates a pending join request for private groups', async () => {
    prisma.communityGroup.findFirst.mockResolvedValue({
      id: groupId,
      name: 'Private Group',
      privacy: CommunityPrivacy.PRIVATE,
    });
    prisma.communityGroupMember.findUnique.mockResolvedValue(null);
    prisma.communityJoinRequest.upsert.mockResolvedValue({
      id: 'req-1',
      status: CommunityJoinRequestStatus.PENDING,
    });
    prisma.communityGroupMember.findMany.mockResolvedValue([{ userId: 'admin-1' }]);

    const result = await service.joinGroup(userId, groupId, { message: 'Please add me' });

    expect(result.status).toBe('pending');
    expect(prisma.communityJoinRequest.upsert).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalled();
  });
});
