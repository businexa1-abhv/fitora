import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';
import { CreateBookingDto } from '../../bookings/dto';

export class ChannelAvailabilityQueryDto {
  @IsUUID()
  venueId!: string;

  @IsOptional()
  @IsString()
  date?: string;
}

export class ChannelHoldDto {
  @IsUUID()
  courtId!: string;

  @IsUUID()
  slotId!: string;

  @IsString()
  idempotencyKey!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  seats?: number;

  @IsOptional()
  @IsString()
  externalBookingId?: string;
}

export class ChannelReleaseDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ChannelCreateBookingDto extends CreateBookingDto {
  @IsString()
  idempotencyKey!: string;

  @IsString()
  externalBookingId!: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}

/** Shared POST /bookings body; channel-only fields stay optional for JWT player clients. */
export class UnifiedCreateBookingDto extends CreateBookingDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  externalBookingId?: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}

export class ChannelCancelBookingDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsString()
  externalBookingId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateIntegrationDto {
  @IsUUID()
  tenantId!: string;

  @IsEnum(IntegrationProvider)
  provider!: IntegrationProvider;

  @IsString()
  name!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  outboundEndpoint?: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @IsOptional()
  @IsUrl({ require_tld: false })
  outboundEndpoint?: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class CreateSlotMappingDto {
  @IsUUID()
  slotId!: string;

  @IsString()
  externalSlotId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
