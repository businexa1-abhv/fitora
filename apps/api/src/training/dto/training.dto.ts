import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
  ValidateNested,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Sport UUID' })
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @ApiPropertyOptional({ description: 'Sport slug e.g. badminton' })
  @IsOptional()
  @IsString()
  sportSlug?: string;

  @ApiPropertyOptional({ description: 'Legacy sport type enum string' })
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(3)
  minAge: number;

  @ApiProperty({ example: 16 })
  @IsInt()
  @Min(4)
  maxAge: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  fee: number;
}

export class UpdateProgramDto extends PartialType(CreateProgramDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBatchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Mon, Wed, Fri 4–5 PM' })
  @IsString()
  @IsNotEmpty()
  schedule: string;

  @ApiProperty()
  @IsUUID()
  trainerId: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateBatchDto extends PartialType(CreateBatchDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignTrainerDto {
  @ApiProperty()
  @IsUUID()
  trainerId: string;
}

export class CreateKidDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '2015-06-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ description: 'Allergies, conditions, medications' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalNotes?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emergencyContact: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emergencyPhone: string;
}

export class UpdateKidDto extends PartialType(CreateKidDto) {}

export class EnrollKidDto {
  @ApiProperty()
  @IsUUID()
  kidId: string;

  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class EnrollWithKidDto extends CreateKidDto {
  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsBoolean()
  present: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchAttendanceItemDto {
  @ApiProperty()
  @IsUUID()
  enrollmentId: string;

  @ApiProperty()
  @IsBoolean()
  present: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MarkBatchAttendanceDto {
  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [BatchAttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAttendanceItemDto)
  records: BatchAttendanceItemDto[];
}

export class SkillRatingDto {
  @ApiProperty()
  @IsString()
  skill: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}

export class CreateProgressReportDto {
  @ApiProperty()
  @IsUUID()
  enrollmentId: string;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiPropertyOptional({ type: [SkillRatingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillRatingDto)
  skills?: SkillRatingDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class UpdateProgressReportDto extends PartialType(CreateProgressReportDto) {}

export class TrainingProgramResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  minAge: number;

  @ApiProperty()
  maxAge: number;

  @ApiProperty()
  fee: string;
}

export class ParentDashboardDto {
  @ApiProperty()
  kidsCount: number;

  @ApiProperty()
  activeEnrollments: number;

  @ApiProperty()
  upcomingSessions: number;
}

export class TrainerDashboardDto {
  @ApiProperty()
  batchCount: number;

  @ApiProperty()
  activeStudents: number;

  @ApiProperty()
  attendanceMarkedToday: number;
}
