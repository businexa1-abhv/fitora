import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class CreateRecurringBookingDto {
  @ApiProperty({ description: 'Court UUID' })
  @IsUUID()
  courtId: string;

  @ApiPropertyOptional({ description: 'Link to an owner-defined slot schedule' })
  @IsOptional()
  @IsUUID()
  slotScheduleId?: string;

  @ApiPropertyOptional({ description: 'Day of week (0=Sun … 6=Sat) when not using slotScheduleId' })
  @ValidateIf((dto: CreateRecurringBookingDto) => !dto.slotScheduleId)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Start hour (0–23) when not using slotScheduleId' })
  @ValidateIf((dto: CreateRecurringBookingDto) => !dto.slotScheduleId)
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  startMinute?: number;

  @ApiPropertyOptional({ description: 'End hour (1–24) when not using slotScheduleId' })
  @ValidateIf((dto: CreateRecurringBookingDto) => !dto.slotScheduleId)
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  endMinute?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
