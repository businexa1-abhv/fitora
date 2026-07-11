import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CouponAppliesTo,
  CouponCodeType,
  CouponDiscountType,
} from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: CouponCodeType, default: CouponCodeType.PROMO })
  @IsEnum(CouponCodeType)
  codeType: CouponCodeType;

  @ApiPropertyOptional({ description: 'Scope coupon to a court' })
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @ApiPropertyOptional({ description: 'Required for corporate codes' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiProperty({ enum: CouponDiscountType })
  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ enum: CouponAppliesTo, default: CouponAppliesTo.MEMBERSHIP })
  @IsOptional()
  @IsEnum(CouponAppliesTo)
  appliesTo?: CouponAppliesTo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CouponQueryDto {
  @ApiPropertyOptional({ enum: CouponCodeType })
  @IsOptional()
  @IsEnum(CouponCodeType)
  codeType?: CouponCodeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class CouponResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  codeType: string;

  @ApiProperty()
  discountType: string;

  @ApiProperty()
  discountValue: string;

  @ApiProperty()
  usageCount: number;

  @ApiPropertyOptional()
  usageLimit?: number | null;

  @ApiProperty()
  isActive: boolean;
}
