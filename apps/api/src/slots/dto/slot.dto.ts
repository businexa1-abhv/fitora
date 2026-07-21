import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ClosureReason, SlotPricingRuleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSlotDto {
  @ApiProperty({ example: '2026-07-10T06:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-10T07:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class GenerateSlotsDto {
  @ApiProperty({ example: '2026-07-10' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 6 })
  @IsNumber()
  @Min(0)
  @Max(23)
  startHour: number;

  @ApiProperty({ example: 22 })
  @IsNumber()
  @Min(1)
  @Max(24)
  endHour: number;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(15)
  @Max(480)
  durationMinutes: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class GenerateRecurringSlotsDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Generate only for specific schedule IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scheduleIds?: string[];
}

export class UpdateSlotDto {
  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: '2026-07-10T06:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-07-10T07:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    enum: ['AVAILABLE', 'BLOCKED', 'MAINTENANCE', 'TOURNAMENT', 'PRIVATE', 'CLOSED'],
  })
  @IsOptional()
  @IsString()
  operationalState?: 'AVAILABLE' | 'BLOCKED' | 'MAINTENANCE' | 'TOURNAMENT' | 'PRIVATE' | 'CLOSED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Optimistic concurrency token' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}

export class CreateSlotCanonicalDto extends CreateSlotDto {
  @ApiProperty({ description: 'Court UUID' })
  @IsString()
  @IsNotEmpty()
  courtId: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class SlotActionDto {
  @ApiPropertyOptional({ description: 'Optimistic concurrency token' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    enum: ['BLOCKED', 'MAINTENANCE', 'TOURNAMENT', 'PRIVATE', 'CLOSED'],
  })
  @IsOptional()
  @IsString()
  reason?: 'BLOCKED' | 'MAINTENANCE' | 'TOURNAMENT' | 'PRIVATE' | 'CLOSED';
}

export class VenueAvailabilityQueryDto {
  @ApiPropertyOptional({ example: '2026-07-21' })
  @IsOptional()
  @IsString()
  date?: string;
}

export class CreateSlotScheduleDto {
  @ApiProperty({ example: 'Weekday Morning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: [1, 2, 3, 4, 5], description: '0=Sun … 6=Sat' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  startMinute?: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  @Max(24)
  endHour: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  endMinute?: number;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes: number;

  @ApiProperty({ example: 400 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateSlotScheduleDto extends PartialType(CreateSlotScheduleDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePricingRuleDto {
  @ApiProperty({ enum: SlotPricingRuleType })
  @IsEnum(SlotPricingRuleType)
  type: SlotPricingRuleType;

  @ApiProperty({ example: 'Evening Peak' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 1.5,
    description: 'Price multiplier (ignored if fixedPrice set)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  multiplier?: number;

  @ApiPropertyOptional({ example: 750, description: 'Fixed price override' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number;

  @ApiPropertyOptional({ example: 17, description: 'Peak start hour (PEAK rules)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @ApiPropertyOptional({ example: 22, description: 'Peak end hour (PEAK rules)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: '2026-08-15', description: 'Specific date (HOLIDAY rules)' })
  @IsOptional()
  @IsDateString()
  holidayDate?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  priority?: number;
}

export class UpdatePricingRuleDto extends PartialType(CreatePricingRuleDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateClosureDto {
  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: ClosureReason, default: ClosureReason.BLOCKED })
  @IsOptional()
  @IsEnum(ClosureReason)
  reason?: ClosureReason;

  @ApiProperty({ example: 'Independence Day closure' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;
}

export class UpdateClosureDto extends PartialType(CreateClosureDto) {}

export class SlotQueryDto {
  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  date: string;
}

export class CalendarQueryDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  endDate: string;
}

export class SlotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  courtId: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  price: string;

  @ApiProperty()
  isBlocked: boolean;

  @ApiProperty()
  isBooked: boolean;

  @ApiPropertyOptional()
  capacity?: number;

  @ApiPropertyOptional()
  availableSeats?: number;

  @ApiPropertyOptional()
  reservedSeats?: number;

  @ApiPropertyOptional()
  confirmedSeats?: number;

  @ApiPropertyOptional()
  availabilityStatus?: string;
}

export class CalendarDayDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  totalSlots: number;

  @ApiProperty()
  availableSlots: number;

  @ApiProperty()
  bookedSlots: number;

  @ApiProperty()
  blockedSlots: number;

  @ApiProperty()
  hasClosure: boolean;
}
