import {
  CommunityAnnouncement,
  CommunityFeedItem,
  CommunityGroup,
  CommunityGroupMember,
  CommunityMatch,
  CommunityMatchPlayer,
  CommunityMessage,
  CommunityMessageReaction,
  CommunityMemberRole,
  CommunityPinnedMessage,
  User,
} from '@prisma/client';

export const COMMUNITY_MODERATOR_ROLES: CommunityMemberRole[] = [
  CommunityMemberRole.OWNER,
  CommunityMemberRole.ADMIN,
  CommunityMemberRole.CO_ADMIN,
  CommunityMemberRole.MODERATOR,
];

export const userSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

export type UserSummaryRow = Pick<User, keyof typeof userSummarySelect>;

export function mapUserSummary(user: UserSummaryRow) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  };
}

type GroupRow = CommunityGroup & {
  members?: CommunityGroupMember[];
  owner?: UserSummaryRow;
  _count?: { joinRequests?: number; announcements?: number; media?: number };
  matches?: CommunityMatch[];
};

export function mapGroupSummary(group: GroupRow, viewerUserId?: string) {
  const membership = group.members?.find((m) => m.userId === viewerUserId);
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    emoji: group.emoji,
    coverPhotoUrl: group.coverPhotoUrl,
    groupType: group.groupType,
    privacy: group.privacy,
    skillLevel: group.skillLevel,
    city: group.city,
    locationLabel: group.locationLabel,
    memberCount: group.memberCount,
    ratingAvg: Number(group.ratingAvg),
    isTrending: group.isTrending,
    lastActivityAt: group.lastActivityAt.toISOString(),
    myRole: membership?.role ?? null,
    myStatus: membership?.status ?? null,
  };
}

export function mapGroupDetail(group: GroupRow, viewerUserId?: string) {
  const upcoming = group.matches?.[0] ?? null;
  return {
    ...mapGroupSummary(group, viewerUserId),
    description: group.description,
    rules: group.rules,
    maxPlayers: group.maxPlayers,
    playingDays: group.playingDays,
    playingWindows: group.playingWindows,
    homeCourtId: group.homeCourtId,
    sportId: group.sportId,
    tenantId: group.tenantId,
    owner: group.owner ? mapUserSummary(group.owner) : null,
    upcomingMatch: upcoming ? mapMatchSummary(upcoming, viewerUserId) : null,
    announcementCount: group._count?.announcements ?? 0,
    mediaCount: group._count?.media ?? 0,
    joinRequestCount: group._count?.joinRequests ?? 0,
  };
}

type MatchRow = CommunityMatch & {
  group?: Pick<CommunityGroup, 'name' | 'emoji'>;
  players?: (CommunityMatchPlayer & { user?: UserSummaryRow })[];
};

export function mapMatchSummary(match: MatchRow, viewerUserId?: string) {
  const myPlayer = match.players?.find((p) => p.userId === viewerUserId);
  return {
    id: match.id,
    groupId: match.groupId,
    title: match.title,
    venueLabel: match.venueLabel,
    startsAt: match.startsAt.toISOString(),
    endsAt: match.endsAt?.toISOString() ?? null,
    requiredPlayers: match.requiredPlayers,
    confirmedCount: match.confirmedCount,
    skillLevel: match.skillLevel,
    entryFee: Number(match.entryFee),
    shuttleIncluded: match.shuttleIncluded,
    ballIncluded: match.ballIncluded,
    matchType: match.matchType,
    status: match.status,
    needsPlayers: match.needsPlayers,
    groupName: match.group?.name,
    groupEmoji: match.group?.emoji ?? null,
    myRsvp: myPlayer?.rsvp ?? null,
  };
}

export function mapMatchDetail(match: MatchRow, viewerUserId?: string) {
  return {
    ...mapMatchSummary(match, viewerUserId),
    courtId: match.courtId,
    bookingId: match.bookingId,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    winnerLabel: match.winnerLabel,
    liveStartedAt: match.liveStartedAt?.toISOString() ?? null,
    players: (match.players ?? []).map((p) => ({
      user: p.user
        ? mapUserSummary(p.user)
        : { id: p.userId, firstName: '', lastName: '', avatarUrl: null },
      rsvp: p.rsvp,
      note: p.note,
      isHost: p.isHost,
      checkedInAt: p.checkedInAt?.toISOString() ?? null,
    })),
  };
}

type MessageRow = CommunityMessage & {
  author: UserSummaryRow;
  reactions?: CommunityMessageReaction[];
  replyTo?: (CommunityMessage & { author?: UserSummaryRow }) | null;
  pins?: CommunityPinnedMessage[];
};

export function mapMessage(message: MessageRow, viewerUserId?: string) {
  const reactionMap = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of message.reactions ?? []) {
    const existing = reactionMap.get(r.emoji) ?? { count: 0, reactedByMe: false };
    existing.count += 1;
    if (r.userId === viewerUserId) existing.reactedByMe = true;
    reactionMap.set(r.emoji, existing);
  }

  return {
    id: message.id,
    groupId: message.groupId,
    type: message.type,
    body: message.body,
    mediaUrl: message.mediaUrl,
    mediaMimeType: message.mediaMimeType,
    replyToId: message.replyToId,
    mentionUserIds: message.mentionUserIds,
    isPinned: message.isPinned || (message.pins?.length ?? 0) > 0,
    createdAt: message.createdAt.toISOString(),
    author: mapUserSummary(message.author),
    reactions: [...reactionMap.entries()].map(([emoji, data]) => ({ emoji, ...data })),
    replyPreview: message.replyTo
      ? {
          id: message.replyTo.id,
          body: message.replyTo.body,
          authorName: message.replyTo.author
            ? `${message.replyTo.author.firstName} ${message.replyTo.author.lastName}`.trim()
            : 'Unknown',
        }
      : null,
  };
}

type AnnouncementRow = CommunityAnnouncement & { author: UserSummaryRow };

export function mapAnnouncement(row: AnnouncementRow) {
  return {
    id: row.id,
    groupId: row.groupId,
    type: row.type,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    author: mapUserSummary(row.author),
  };
}

type FeedRow = CommunityFeedItem & { author?: UserSummaryRow | null };

export function mapFeedItem(row: FeedRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    imageUrl: row.imageUrl,
    groupId: row.groupId,
    createdAt: row.createdAt.toISOString(),
    author: row.author ? mapUserSummary(row.author) : null,
  };
}

export function isModeratorRole(role: CommunityMemberRole | null | undefined): boolean {
  return role != null && COMMUNITY_MODERATOR_ROLES.includes(role);
}

export function slugifyGroupName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}
