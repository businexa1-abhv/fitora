import type {
  CommunityAnnouncement,
  CommunityFeedItem,
  CommunityFriendship,
  CommunityGroupDetail,
  CommunityGroupSummary,
  CommunityHomePayload,
  CommunityMatchDetail,
  CommunityMatchSummary,
  CommunityMessage,
  CommunityReportTarget,
  CommunityRsvpStatus,
  CommunitySearchResult,
  CommunityUserSummary,
  CreateCommunityGroupPayload,
  CreateCommunityMatchPayload,
  SendCommunityMessagePayload,
} from '@fitora/shared';
import { apiFetch } from './api';

export interface CommunityMemberRow {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  user: CommunityUserSummary;
}

export interface CommunityJoinRequestRow {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: CommunityUserSummary;
}

export interface CommunityMediaItem {
  id: string;
  url: string;
  mimeType: string | null;
  createdAt: string;
  author: CommunityUserSummary;
}

export interface CommunityPollOption {
  id: string;
  label: string;
  voteCount: number;
  votedByMe: boolean;
}

export interface CommunityPoll {
  id: string;
  question: string;
  endsAt: string | null;
  options: CommunityPollOption[];
}

export interface CommunityLeaderboardEntry {
  rank: number;
  user: CommunityUserSummary;
  points: number;
  wins: number;
  matchesPlayed: number;
}

export interface ReportContentPayload {
  targetType: CommunityReportTarget;
  targetId: string;
  reason: string;
  details?: string;
}

export function getCommunityHome(
  token: string,
  params?: { city?: string; latitude?: number; longitude?: number },
) {
  const query = new URLSearchParams();
  if (params?.city) query.set('city', params.city);
  if (params?.latitude != null) query.set('latitude', String(params.latitude));
  if (params?.longitude != null) query.set('longitude', String(params.longitude));
  const qs = query.toString();
  return apiFetch<CommunityHomePayload>(`/community/home${qs ? `?${qs}` : ''}`, {}, token);
}

export function createGroup(token: string, payload: CreateCommunityGroupPayload) {
  return apiFetch<CommunityGroupDetail>(
    '/community/groups',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function getGroup(token: string, groupId: string) {
  return apiFetch<CommunityGroupDetail>(`/community/groups/${groupId}`, {}, token);
}

export function joinGroup(token: string, groupId: string, message?: string) {
  return apiFetch<{ status: string }>(
    `/community/groups/${groupId}/join`,
    { method: 'POST', body: JSON.stringify({ message }) },
    token,
  );
}

export function leaveGroup(token: string, groupId: string) {
  return apiFetch<void>(`/community/groups/${groupId}/leave`, { method: 'POST' }, token);
}

export function getMyGroups(token: string) {
  return apiFetch<CommunityGroupSummary[]>('/community/groups/my', {}, token);
}

export function getGroupMembers(token: string, groupId: string) {
  return apiFetch<CommunityMemberRow[]>(`/community/groups/${groupId}/members`, {}, token);
}

export function getJoinRequests(token: string, groupId: string) {
  return apiFetch<CommunityJoinRequestRow[]>(
    `/community/groups/${groupId}/join-requests`,
    {},
    token,
  );
}

export function reviewJoinRequest(
  token: string,
  groupId: string,
  requestId: string,
  action: 'approve' | 'reject' | 'waitlist',
) {
  return apiFetch<{ status: string }>(
    `/community/groups/${groupId}/join-requests/${requestId}/${action}`,
    { method: 'POST' },
    token,
  );
}

export function createMatch(token: string, payload: CreateCommunityMatchPayload) {
  return apiFetch<CommunityMatchDetail>(
    '/community/matches',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function createMatchFromBooking(
  token: string,
  payload: {
    bookingId: string;
    groupId?: string;
    title?: string;
    venueLabel?: string;
    courtId?: string;
    startsAt?: string;
    endsAt?: string;
    requiredPlayers?: number;
    skillLevel?: CreateCommunityMatchPayload['skillLevel'];
    entryFee?: number;
    shuttleIncluded?: boolean;
    ballIncluded?: boolean;
    matchType?: CreateCommunityMatchPayload['matchType'];
  },
) {
  return apiFetch<CommunityMatchDetail>(
    '/community/matches/from-booking',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function getMatch(token: string, matchId: string) {
  return apiFetch<CommunityMatchDetail>(`/community/matches/${matchId}`, {}, token);
}

export function rsvpMatch(
  token: string,
  matchId: string,
  rsvp: CommunityRsvpStatus,
  note?: string,
) {
  return apiFetch<CommunityMatchDetail>(
    `/community/matches/${matchId}/rsvp`,
    { method: 'POST', body: JSON.stringify({ rsvp, note }) },
    token,
  );
}

export function getMessages(token: string, groupId: string, before?: string, limit = 50) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (before) query.set('before', before);
  return apiFetch<CommunityMessage[]>(
    `/community/groups/${groupId}/messages?${query.toString()}`,
    {},
    token,
  );
}

export function sendMessage(token: string, groupId: string, payload: SendCommunityMessagePayload) {
  return apiFetch<CommunityMessage>(
    `/community/groups/${groupId}/messages`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function reactMessage(token: string, messageId: string, emoji: string) {
  return apiFetch<CommunityMessage>(
    `/community/messages/${messageId}/react`,
    { method: 'POST', body: JSON.stringify({ emoji }) },
    token,
  );
}

export function pinMessage(token: string, messageId: string) {
  return apiFetch<CommunityMessage>(
    `/community/messages/${messageId}/pin`,
    { method: 'POST' },
    token,
  );
}

export function createAnnouncement(
  token: string,
  groupId: string,
  payload: { type: string; title: string; body: string; pinned?: boolean },
) {
  return apiFetch<CommunityAnnouncement>(
    `/community/groups/${groupId}/announcements`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function getAnnouncements(token: string, groupId: string) {
  return apiFetch<CommunityAnnouncement[]>(`/community/groups/${groupId}/announcements`, {}, token);
}

export function getGroupMedia(token: string, groupId: string) {
  return apiFetch<CommunityMediaItem[]>(`/community/groups/${groupId}/media`, {}, token);
}

export function getGroupPolls(token: string, groupId: string) {
  return apiFetch<CommunityPoll[]>(`/community/groups/${groupId}/polls`, {}, token);
}

export function createPoll(
  token: string,
  groupId: string,
  payload: { question: string; options: string[]; closesAt?: string },
) {
  return apiFetch<CommunityPoll>(
    `/community/groups/${groupId}/polls`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function votePoll(token: string, pollId: string, optionId: string) {
  return apiFetch<CommunityPoll>(
    `/community/polls/${pollId}/vote`,
    { method: 'POST', body: JSON.stringify({ optionId }) },
    token,
  );
}

export function getGroupLeaderboard(token: string, groupId: string) {
  return apiFetch<CommunityLeaderboardEntry[]>(
    `/community/groups/${groupId}/leaderboard`,
    {},
    token,
  );
}

export function searchCommunity(token: string, q: string) {
  return apiFetch<CommunitySearchResult>(`/community/search?q=${encodeURIComponent(q)}`, {}, token);
}

export function listFriends(token: string) {
  return apiFetch<CommunityFriendship[]>('/community/friends', {}, token);
}

export function sendFriendRequest(token: string, userId: string) {
  return apiFetch<CommunityFriendship>(
    '/community/friends/request',
    { method: 'POST', body: JSON.stringify({ userId }) },
    token,
  );
}

export function respondFriendRequest(token: string, friendshipId: string, accept: boolean) {
  return apiFetch<CommunityFriendship>(
    `/community/friends/${friendshipId}/${accept ? 'accept' : 'decline'}`,
    { method: 'POST' },
    token,
  );
}

export function getCommunityFeed(token: string, page = 1) {
  return apiFetch<CommunityFeedItem[]>(`/community/feed?page=${page}`, {}, token);
}

export function reportContent(token: string, payload: ReportContentPayload) {
  return apiFetch<void>(
    '/community/report',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function getNeedPlayersMatches(token: string) {
  return apiFetch<CommunityMatchSummary[]>('/community/matches/need-players', {}, token);
}
