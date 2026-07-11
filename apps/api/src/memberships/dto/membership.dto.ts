import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
import { MembershipDuration } from '@prisma/client';

export class PlanBenefitsDto {
  @ApiPropertyOptional({ example: 10, description: 'Booking discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bookingDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  priorityBooking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  freeGuestPasses?: number;

  @ApiPropertyOptional({ type: [String], example: ['Free racket rental', 'Priority slots'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  perks?: string[];
}

export class CreateMembershipPlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: MembershipDuration })
  @IsEnum(MembershipDuration)
  duration: MembershipDuration;

  @ApiProperty({ example: 2999 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Max discounted bookings per membership period' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBookings?: number;

  @ApiPropertyOptional({ type: PlanBenefitsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanBenefitsDto)
  benefits?: PlanBenefitsDto;
}

export class UpdateMembershipPlanDto extends PartialType(CreateMembershipPlanDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PurchaseMembershipDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ example: 'SAVE20' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class RenewMembershipDto {
  @ApiPropertyOptional({ example: 'RENEW10' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: ['MEMBERSHIP', 'BOOKING'] })
  @IsString()
  appliesTo: 'MEMBERSHIP' | 'BOOKING';

  @ApiProperty({ example: 2999 })
  @IsNumber()
  @Min(0)
  orderAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;
}

export class SetAutoRenewDto {
  @ApiProperty()
  @IsBoolean()
  autoRenew: boolean;
}

export class MembershipDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courtId?: string;
}

export class MembershipPlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  duration: string;

  @ApiProperty()
  price: string;

  @ApiPropertyOptional()
  maxBookings?: number | null;

  @ApiPropertyOptional()
  benefits?: Record<string, unknown> | null;
}

export class MembershipUsageResponseDto {
  @ApiProperty()
  purchaseId: string;

  @ApiProperty()
  bookingsUsed: number;

  @ApiPropertyOptional()
  maxBookings?: number | null;

  @ApiPropertyOptional()
  bookingsRemaining?: number | null;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty()
  startDate: string | null;

  @ApiProperty()
  endDate: string | null;
}

export class MembershipDashboardDto {
  @ApiProperty()
  totalPlans: number;

  @ApiProperty()
  activeSubscribers: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  expiringSoon: number;

  @ApiProperty()
  promoCodesActive: number;

  @ApiProperty()
  corporateCodesActive: number;
}
