export enum CommunityGroupType {
  BADMINTON = 'BADMINTON',
  CRICKET = 'CRICKET',
  FOOTBALL = 'FOOTBALL',
  PICKLEBALL = 'PICKLEBALL',
  TENNIS = 'TENNIS',
  VOLLEYBALL = 'VOLLEYBALL',
  BASKETBALL = 'BASKETBALL',
  TABLE_TENNIS = 'TABLE_TENNIS',
  RUNNING_CLUB = 'RUNNING_CLUB',
  CYCLING_CLUB = 'CYCLING_CLUB',
  FITNESS_GROUP = 'FITNESS_GROUP',
  CORPORATE = 'CORPORATE',
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  ACADEMY_BATCH = 'ACADEMY_BATCH',
}

export enum CommunityPrivacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  INVITE_ONLY = 'INVITE_ONLY',
}

export enum CommunitySkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PROFESSIONAL = 'PROFESSIONAL',
}

export enum CommunityPlayingWindow {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  WEEKEND = 'WEEKEND',
}

export enum CommunityMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  CO_ADMIN = 'CO_ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
}

export enum CommunityMemberStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  WAITLISTED = 'WAITLISTED',
  MUTED = 'MUTED',
  BANNED = 'BANNED',
  LEFT = 'LEFT',
}

export enum CommunityJoinRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}

export enum CommunityMatchType {
  FRIENDLY = 'FRIENDLY',
  PRACTICE = 'PRACTICE',
  TOURNAMENT = 'TOURNAMENT',
  TRAINING = 'TRAINING',
  OPEN_MATCH = 'OPEN_MATCH',
}

export enum CommunityMatchStatus {
  WAITING_PLAYERS = 'WAITING_PLAYERS',
  CONFIRMED = 'CONFIRMED',
  FULL = 'FULL',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  LIVE = 'LIVE',
}

export enum CommunityRsvpStatus {
  COMING = 'COMING',
  MAYBE = 'MAYBE',
  NOT_COMING = 'NOT_COMING',
  LATE = 'LATE',
  NEED_PICKUP = 'NEED_PICKUP',
  NEED_PARTNER = 'NEED_PARTNER',
  BRING_SHUTTLE = 'BRING_SHUTTLE',
  BRING_BALL = 'BRING_BALL',
  NEED_RACQUET = 'NEED_RACQUET',
}

export enum CommunityMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  VOICE = 'VOICE',
  DOCUMENT = 'DOCUMENT',
  GIF = 'GIF',
  STICKER = 'STICKER',
  SYSTEM = 'SYSTEM',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  POLL = 'POLL',
  MATCH_CARD = 'MATCH_CARD',
}

export enum CommunityAnnouncementType {
  PRACTICE_CANCELLED = 'PRACTICE_CANCELLED',
  COURT_CHANGED = 'COURT_CHANGED',
  TOURNAMENT = 'TOURNAMENT',
  HOLIDAY = 'HOLIDAY',
  MEMBERSHIP_RENEWAL = 'MEMBERSHIP_RENEWAL',
  TRAINING = 'TRAINING',
  FEES_DUE = 'FEES_DUE',
  MAINTENANCE = 'MAINTENANCE',
  WEATHER_ALERT = 'WEATHER_ALERT',
  CUSTOM = 'CUSTOM',
}

export enum CommunityFriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  BLOCKED = 'BLOCKED',
}

export enum CommunityReportTarget {
  USER = 'USER',
  MESSAGE = 'MESSAGE',
  GROUP = 'GROUP',
  MATCH = 'MATCH',
}

export enum CommunityFeedItemType {
  MATCH = 'MATCH',
  PHOTO = 'PHOTO',
  ACHIEVEMENT = 'ACHIEVEMENT',
  TOURNAMENT_WINNER = 'TOURNAMENT_WINNER',
  PLAYER_OF_WEEK = 'PLAYER_OF_WEEK',
  NEW_GROUP = 'NEW_GROUP',
  COACH_POST = 'COACH_POST',
  OWNER_ANNOUNCEMENT = 'OWNER_ANNOUNCEMENT',
}

export const COMMUNITY_GROUP_TYPE_LABELS: Record<CommunityGroupType, string> = {
  [CommunityGroupType.BADMINTON]: 'Badminton',
  [CommunityGroupType.CRICKET]: 'Cricket',
  [CommunityGroupType.FOOTBALL]: 'Football',
  [CommunityGroupType.PICKLEBALL]: 'Pickleball',
  [CommunityGroupType.TENNIS]: 'Tennis',
  [CommunityGroupType.VOLLEYBALL]: 'Volleyball',
  [CommunityGroupType.BASKETBALL]: 'Basketball',
  [CommunityGroupType.TABLE_TENNIS]: 'Table Tennis',
  [CommunityGroupType.RUNNING_CLUB]: 'Running Club',
  [CommunityGroupType.CYCLING_CLUB]: 'Cycling Club',
  [CommunityGroupType.FITNESS_GROUP]: 'Fitness Group',
  [CommunityGroupType.CORPORATE]: 'Corporate Group',
  [CommunityGroupType.PRIVATE]: 'Private Group',
  [CommunityGroupType.PUBLIC]: 'Public Group',
  [CommunityGroupType.ACADEMY_BATCH]: 'Academy Batch',
};

export const COMMUNITY_SKILL_LABELS: Record<CommunitySkillLevel, string> = {
  [CommunitySkillLevel.BEGINNER]: 'Beginner',
  [CommunitySkillLevel.INTERMEDIATE]: 'Intermediate',
  [CommunitySkillLevel.ADVANCED]: 'Advanced',
  [CommunitySkillLevel.PROFESSIONAL]: 'Professional',
};

export const COMMUNITY_EMOJI_PRESETS = [
  '🏸',
  '🔥',
  '💪',
  '😂',
  '🎯',
  '⚡',
  '🏆',
  '🥇',
  '🎉',
  '😎',
  '🤝',
  '❤️',
] as const;

export const COMMUNITY_QUICK_REACTIONS = [
  '🏸',
  '🔥',
  '💪',
  '😂',
  '😎',
  '👏',
  '🙌',
  '🎯',
  '🏆',
  '🥇',
  '💯',
  '⚡',
  '🚀',
  '❤️',
  '🤝',
] as const;

export const COMMUNITY_QUICK_REPLIES = [
  'Need One More Player',
  "Let's Go",
  'Game On',
  'Running Late',
  'Court Changed',
] as const;

export interface CommunityUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface CommunityGroupSummary {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  coverPhotoUrl: string | null;
  groupType: CommunityGroupType;
  privacy: CommunityPrivacy;
  skillLevel: CommunitySkillLevel;
  city: string | null;
  locationLabel: string | null;
  memberCount: number;
  ratingAvg: number;
  isTrending: boolean;
  lastActivityAt: string;
  myRole?: CommunityMemberRole | null;
  myStatus?: CommunityMemberStatus | null;
}

export interface CommunityGroupDetail extends CommunityGroupSummary {
  description: string | null;
  rules: string | null;
  maxPlayers: number;
  playingDays: string[];
  playingWindows: CommunityPlayingWindow[];
  homeCourtId: string | null;
  sportId: string | null;
  tenantId: string | null;
  owner: CommunityUserSummary;
  upcomingMatch: CommunityMatchSummary | null;
  announcementCount: number;
  mediaCount: number;
  joinRequestCount: number;
}

export interface CommunityMatchSummary {
  id: string;
  groupId: string;
  title: string;
  venueLabel: string | null;
  startsAt: string;
  endsAt: string | null;
  requiredPlayers: number;
  confirmedCount: number;
  skillLevel: CommunitySkillLevel;
  entryFee: number;
  shuttleIncluded: boolean;
  ballIncluded: boolean;
  matchType: CommunityMatchType;
  status: CommunityMatchStatus;
  needsPlayers: boolean;
  groupName?: string;
  groupEmoji?: string | null;
  myRsvp?: CommunityRsvpStatus | null;
}

export interface CommunityMatchDetail extends CommunityMatchSummary {
  courtId: string | null;
  bookingId: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  winnerLabel: string | null;
  liveStartedAt: string | null;
  players: Array<{
    user: CommunityUserSummary;
    rsvp: CommunityRsvpStatus;
    note: string | null;
    isHost: boolean;
    checkedInAt: string | null;
  }>;
}

export interface CommunityMessage {
  id: string;
  groupId: string;
  type: CommunityMessageType;
  body: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  replyToId: string | null;
  mentionUserIds: string[];
  isPinned: boolean;
  createdAt: string;
  author: CommunityUserSummary;
  reactions: Array<{ emoji: string; count: number; reactedByMe: boolean }>;
  replyPreview?: { id: string; body: string | null; authorName: string } | null;
}

export interface CommunityAnnouncement {
  id: string;
  groupId: string;
  type: CommunityAnnouncementType;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: CommunityUserSummary;
}

export interface CommunityFeedItem {
  id: string;
  type: CommunityFeedItemType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  groupId: string | null;
  createdAt: string;
  author?: CommunityUserSummary | null;
}

export interface CommunityFriendship {
  id: string;
  status: CommunityFriendshipStatus;
  user: CommunityUserSummary;
  createdAt: string;
}

export interface CommunityHomePayload {
  nearbyGroups: CommunityGroupSummary[];
  myGroups: CommunityGroupSummary[];
  todaysMatches: CommunityMatchSummary[];
  upcomingMatches: CommunityMatchSummary[];
  needPlayers: CommunityMatchSummary[];
  recentAnnouncements: CommunityAnnouncement[];
  nearbyCourts: Array<{
    id: string;
    name: string;
    city: string;
    sportName?: string | null;
  }>;
  friendsPlayingNow: CommunityUserSummary[];
  trendingCommunities: CommunityGroupSummary[];
  suggestedGroups: CommunityGroupSummary[];
  feed: CommunityFeedItem[];
}

export interface CreateCommunityGroupPayload {
  name: string;
  groupType: CommunityGroupType;
  sportId?: string;
  locationLabel?: string;
  city?: string;
  homeCourtId?: string;
  skillLevel?: CommunitySkillLevel;
  maxPlayers?: number;
  playingDays?: string[];
  playingWindows?: CommunityPlayingWindow[];
  description?: string;
  rules?: string;
  coverPhotoUrl?: string;
  emoji?: string;
  privacy?: CommunityPrivacy;
  tenantId?: string;
  trainingBatchId?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateCommunityMatchPayload {
  groupId: string;
  title: string;
  venueLabel?: string;
  courtId?: string;
  bookingId?: string;
  startsAt: string;
  endsAt?: string;
  requiredPlayers?: number;
  skillLevel?: CommunitySkillLevel;
  entryFee?: number;
  shuttleIncluded?: boolean;
  ballIncluded?: boolean;
  matchType?: CommunityMatchType;
}

export interface SendCommunityMessagePayload {
  type?: CommunityMessageType;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  replyToId?: string;
  mentionUserIds?: string[];
}

export interface CommunitySearchResult {
  groups: CommunityGroupSummary[];
  players: CommunityUserSummary[];
  venues: Array<{ id: string; name: string; city: string }>;
  sports: Array<{ id: string; name: string; slug: string }>;
  friends: CommunityUserSummary[];
}
