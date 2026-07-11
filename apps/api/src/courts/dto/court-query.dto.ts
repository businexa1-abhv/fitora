import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourtApprovalStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CourtQueryDto {
  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by sport UUID' })
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @ApiPropertyOptional({ example: 'badminton' })
  @IsOptional()
  @IsString()
  sportSlug?: string;

  @ApiPropertyOptional({ example: 'BADMINTON', description: 'Legacy sport type filter' })
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiPropertyOptional({ enum: CourtApprovalStatus })
  @IsOptional()
  @IsEnum(CourtApprovalStatus)
  approvalStatus?: CourtApprovalStatus;

  @ApiPropertyOptional({ example: 'badminton' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Admin only — include inactive courts' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;
}
