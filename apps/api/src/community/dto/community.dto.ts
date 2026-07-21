import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommunityAnnouncementType,
  CommunityGroupType,
  CommunityMatchType,
  CommunityMessageType,
  CommunityPlayingWindow,
  CommunityPrivacy,
  CommunityReportTarget,
  CommunityRsvpStatus,
  CommunitySkillLevel,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class HomeQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class SearchQueryDto extends PaginationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  q: string;
}

export class CreateGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiProperty({ enum: CommunityGroupType })
  @IsEnum(CommunityGroupType)
  groupType: CommunityGroupType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  homeCourtId?: string;

  @ApiPropertyOptional({ enum: CommunitySkillLevel })
  @IsOptional()
  @IsEnum(CommunitySkillLevel)
  skillLevel?: CommunitySkillLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  maxPlayers?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  playingDays?: string[];

  @ApiPropertyOptional({ enum: CommunityPlayingWindow, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(CommunityPlayingWindow, { each: true })
  playingWindows?: CommunityPlayingWindow[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rules?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverPhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string;

  @ApiPropertyOptional({ enum: CommunityPrivacy })
  @IsOptional()
  @IsEnum(CommunityPrivacy)
  privacy?: CommunityPrivacy;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class CreateBatchGroupDto extends CreateGroupDto {
  @ApiProperty()
  @IsUUID()
  trainingBatchId: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rules?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverPhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string;

  @ApiPropertyOptional({ enum: CommunitySkillLevel })
  @IsOptional()
  @IsEnum(CommunitySkillLevel)
  skillLevel?: CommunitySkillLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  maxPlayers?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  playingDays?: string[];

  @ApiPropertyOptional({ enum: CommunityPlayingWindow, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(CommunityPlayingWindow, { each: true })
  playingWindows?: CommunityPlayingWindow[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  homeCourtId?: string;
}

export class JoinGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class ReviewJoinRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class TransferOwnershipDto {
  @ApiProperty()
  @IsUUID()
  newOwnerId: string;
}

export class MemberActionDto {
  @ApiPropertyOptional({ description: 'Mute duration in hours' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  muteHours?: number;
}

export class CreateMatchDto {
  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty()
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  requiredPlayers?: number;

  @ApiPropertyOptional({ enum: CommunitySkillLevel })
  @IsOptional()
  @IsEnum(CommunitySkillLevel)
  skillLevel?: CommunitySkillLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  entryFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shuttleIncluded?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ballIncluded?: boolean;

  @ApiPropertyOptional({ enum: CommunityMatchType })
  @IsOptional()
  @IsEnum(CommunityMatchType)
  matchType?: CommunityMatchType;
}

export class CreateMatchFromBookingDto {
  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiProperty()
  @IsUUID()
  bookingId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  requiredPlayers?: number;
}

export class RsvpDto {
  @ApiProperty({ enum: CommunityRsvpStatus })
  @IsEnum(CommunityRsvpStatus)
  rsvp: CommunityRsvpStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class CheckInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  qrPayload?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({ enum: CommunityMessageType })
  @IsOptional()
  @IsEnum(CommunityMessageType)
  type?: CommunityMessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaMimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  mentionUserIds?: string[];
}

export class ReactMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  emoji: string;
}

export class CreateAnnouncementDto {
  @ApiProperty({ enum: CommunityAnnouncementType })
  @IsEnum(CommunityAnnouncementType)
  type: CommunityAnnouncementType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreatePollDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  question: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closesAt?: string;
}

export class VotePollDto {
  @ApiProperty()
  @IsUUID()
  optionId: string;
}

export class FriendRequestDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class ReportDto {
  @ApiProperty({ enum: CommunityReportTarget })
  @IsEnum(CommunityReportTarget)
  targetType: CommunityReportTarget;

  @ApiProperty()
  @IsUUID()
  targetId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class BlockDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class MessagesQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  before?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class NearbyGroupsQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class ReactQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  emoji: string;
}
