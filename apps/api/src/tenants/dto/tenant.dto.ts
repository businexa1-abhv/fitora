import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class ResolveTenantQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;
}

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsUUID()
  ownerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brandName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  secondaryColor?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brandName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  secondaryColor?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTenantBrandingDto extends UpdateTenantDto {}

export class UpdateTenantPaymentsDto {
  @IsOptional()
  @IsBoolean()
  useOwnPaymentAccount?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  razorpayKeyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  razorpayKeySecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  razorpayWebhookSecret?: string;
}

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatus)
  status!: TenantStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TenantListQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}

export class AddTenantTrainerDto {
  @IsUUID()
  userId!: string;
}
