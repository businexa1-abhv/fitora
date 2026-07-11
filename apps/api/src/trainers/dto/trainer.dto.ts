import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveRequestStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTrainerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  certifications?: Record<string, unknown>[];
}

export class CreateTrainingNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional({ example: '2026-07-05' })
  @IsOptional()
  @IsDateString()
  sessionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateTrainingNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  sessionDate?: string;
}

export class CreateLeaveRequestDto {
  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-07-12' })
  @IsDateString()
  endDate!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;
}

export class ReviewLeaveRequestDto {
  @ApiProperty({ enum: LeaveRequestStatus })
  @IsEnum(LeaveRequestStatus)
  status!: LeaveRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}

export class ListTrainingNotesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;
}

export class BatchAttendanceQueryDto {
  @ApiProperty({ example: '2026-07-05' })
  @IsDateString()
  date!: string;
}
