import { ServiceCategory, ServiceOrderStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceListingDto {
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  sportSlug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  turnaroundDays?: number;
}

export class UpdateServiceListingDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  turnaroundDays?: number;

  @IsOptional()
  isActive?: boolean;
}

export class BookServiceDto {
  @IsString()
  @MaxLength(500)
  pickupAddress!: string;

  @IsString()
  @MaxLength(20)
  pickupPhone!: string;

  @IsString()
  @MaxLength(100)
  pickupCity!: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  equipmentDetails?: string;

  @IsOptional()
  @IsDateString()
  rentalStartDate?: string;

  @IsOptional()
  @IsDateString()
  rentalEndDate?: string;
}

export class UpdateServiceOrderStatusDto {
  @IsEnum(ServiceOrderStatus)
  status!: ServiceOrderStatus;

  @IsOptional()
  @IsString()
  providerNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingReference?: string;
}

export class CreateServiceReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
