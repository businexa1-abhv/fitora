import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AiRecommendQueryDto {
  @ApiPropertyOptional({ description: 'Free-text preferences for personalization' })
  @IsOptional()
  @IsString()
  preferences?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sportSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class AiMembershipRecommendDto extends AiRecommendQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courtId?: string;
}

export class AiTrainingRecommendDto extends AiRecommendQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(3)
  @Max(18)
  kidAge?: number;
}

export class AiProductRecommendDto extends AiRecommendQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;
}

export class AiServiceRecommendDto extends AiRecommendQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class AiWorkoutPlanDto {
  @ApiPropertyOptional({ example: 'Improve stamina for badminton' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced'] })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(7)
  daysPerWeek?: number;

  @ApiPropertyOptional({ default: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(15)
  @Max(120)
  durationMinutes?: number;
}

export class AiDietTipsDto {
  @ApiPropertyOptional({ example: 'Build muscle for cricket' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sportType?: string;
}

export class AiAttendanceInsightsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class AiCoachPerformanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class AiRevenueInsightsDto {
  @ApiPropertyOptional({ enum: ['daily', 'monthly', 'yearly'], default: 'monthly' })
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'])
  period?: 'daily' | 'monthly' | 'yearly';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Scope to a specific court (owners)' })
  @IsOptional()
  @IsUUID()
  courtId?: string;
}
