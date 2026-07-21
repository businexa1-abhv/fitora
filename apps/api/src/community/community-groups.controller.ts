import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';
import { Roles, RequirePermissions } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { CommunityGroupsService } from './community-groups.service';
import {
  CreateBatchGroupDto,
  CreateGroupDto,
  HomeQueryDto,
  JoinGroupDto,
  MemberActionDto,
  NearbyGroupsQueryDto,
  ReviewJoinRequestDto,
  TransferOwnershipDto,
  UpdateGroupDto,
} from './dto/community.dto';

@ApiTags('community')
@ApiBearerAuth('access-token')
@Controller('community')
export class CommunityGroupsController {
  constructor(private readonly groups: CommunityGroupsService) {}

  @Get('home')
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'Community home feed and discovery' })
  home(@CurrentUser() user: AuthUserPayload, @Query() query: HomeQueryDto) {
    return this.groups.getHome(user.id, query);
  }

  @Post('groups')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Create a community group' })
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateGroupDto) {
    return this.groups.createGroup(user.id, dto);
  }

  @Post('owner/groups')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @RequirePermissions(Permission.COMMUNITY_MANAGE)
  @ApiOperation({ summary: 'Court owner: create tenant-linked group' })
  createOwnerGroup(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateGroupDto) {
    return this.groups.createOwnerGroup(user.id, dto);
  }

  @Post('coach/batch-groups')
  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  @ApiOperation({ summary: 'Trainer: create academy batch group' })
  createBatchGroup(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateBatchGroupDto) {
    return this.groups.createBatchGroup(user.id, dto.trainingBatchId, dto);
  }

  @Get('groups/mine')
  @RequirePermissions(Permission.COMMUNITY_READ)
  myGroups(@CurrentUser() user: AuthUserPayload) {
    return this.groups.listMine(user.id);
  }

  @Get('groups/my')
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'Alias for groups/mine' })
  myGroupsAlias(@CurrentUser() user: AuthUserPayload) {
    return this.groups.listMine(user.id);
  }

  @Get('feed')
  @RequirePermissions(Permission.COMMUNITY_READ)
  @ApiOperation({ summary: 'Community feed' })
  feed(@Query('page') page?: string) {
    const pageNum = Math.max(1, Number(page) || 1);
    return this.groups.getFeedPage(pageNum);
  }

  @Get('groups/nearby')
  @RequirePermissions(Permission.COMMUNITY_READ)
  nearby(@CurrentUser() user: AuthUserPayload, @Query() query: NearbyGroupsQueryDto) {
    return this.groups.listNearby(user.id, query);
  }

  @Get('groups/trending')
  @RequirePermissions(Permission.COMMUNITY_READ)
  trending(@CurrentUser() user: AuthUserPayload) {
    return this.groups.listTrending(user.id);
  }

  @Get('groups/:groupId')
  @RequirePermissions(Permission.COMMUNITY_READ)
  getGroup(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.groups.getGroup(user.id, groupId);
  }

  @Patch('groups/:groupId')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  updateGroup(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.updateGroup(user.id, groupId, dto);
  }

  @Delete('groups/:groupId')
  @RequirePermissions(Permission.COMMUNITY_MANAGE)
  deleteGroup(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.groups.deleteGroup(user.id, groupId);
  }

  @Post('groups/:groupId/join')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  join(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: JoinGroupDto,
  ) {
    return this.groups.joinGroup(user.id, groupId, dto);
  }

  @Post('groups/:groupId/leave')
  @RequirePermissions(Permission.COMMUNITY_WRITE)
  leave(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.groups.leaveGroup(user.id, groupId);
  }

  @Get('groups/:groupId/members')
  @RequirePermissions(Permission.COMMUNITY_READ)
  members(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.groups.listMembers(user.id, groupId);
  }

  @Get('groups/:groupId/join-requests')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  joinRequests(@CurrentUser() user: AuthUserPayload, @Param('groupId') groupId: string) {
    return this.groups.listJoinRequests(user.id, groupId);
  }

  @Post('groups/:groupId/join-requests/:requestId/approve')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  approveJoin(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewJoinRequestDto,
  ) {
    return this.groups.reviewJoinRequest(user.id, groupId, requestId, 'approve', dto);
  }

  @Post('groups/:groupId/join-requests/:requestId/reject')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  rejectJoin(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewJoinRequestDto,
  ) {
    return this.groups.reviewJoinRequest(user.id, groupId, requestId, 'reject', dto);
  }

  @Post('groups/:groupId/join-requests/:requestId/waitlist')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  waitlistJoin(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewJoinRequestDto,
  ) {
    return this.groups.reviewJoinRequest(user.id, groupId, requestId, 'waitlist', dto);
  }

  @Post('groups/:groupId/members/:userId/promote')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  promote(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.groups.memberAction(user.id, groupId, targetUserId, 'promote', {});
  }

  @Post('groups/:groupId/members/:userId/demote')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  demote(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.groups.memberAction(user.id, groupId, targetUserId, 'demote', {});
  }

  @Post('groups/:groupId/members/:userId/remove')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  removeMember(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.groups.memberAction(user.id, groupId, targetUserId, 'remove', {});
  }

  @Post('groups/:groupId/members/:userId/mute')
  @RequirePermissions(Permission.COMMUNITY_MODERATE)
  muteMember(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: MemberActionDto,
  ) {
    return this.groups.memberAction(user.id, groupId, targetUserId, 'mute', dto);
  }

  @Post('groups/:groupId/transfer-ownership')
  @RequirePermissions(Permission.COMMUNITY_MANAGE)
  transferOwnership(
    @CurrentUser() user: AuthUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.groups.transferOwnership(user.id, groupId, dto);
  }
}
