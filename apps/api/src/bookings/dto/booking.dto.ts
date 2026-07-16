import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Court UUID (for validation)' })
  @IsUUID()
  courtId: string;

  @ApiProperty({ description: 'Slot UUID to book' })
  @IsUUID()
  slotId: string;

  @ApiPropertyOptional({ description: 'Optional booking notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Coupon UUID' })
  @IsOptional()
  @IsUUID()
  couponId?: string;
}

export class CreateWalkInBookingDto {
  @ApiProperty({ description: 'Court UUID' })
  @IsUUID()
  courtId: string;

  @ApiProperty({ description: 'Slot UUID' })
  @IsUUID()
  slotId: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  guestName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  guestPhone: string;

  @ApiPropertyOptional({ enum: ['Cash', 'UPI', 'Card'], default: 'UPI' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  paymentMethod?: 'Cash' | 'UPI' | 'Card';

  @ApiPropertyOptional({ description: 'Extra equipment fee in INR', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  equipmentFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Seats to reserve', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  seats?: number;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Schedule conflict' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CheckInDto {
  @ApiProperty({ example: 'A1B2C3' })
  @IsString()
  @IsNotEmpty()
  checkInCode: string;
}

export class BookingHistoryQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

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

  @ApiPropertyOptional({ description: 'Cursor for keyset pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size for cursor pagination', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  paymentStatus: string;

  @ApiProperty()
  totalAmount: string;

  @ApiPropertyOptional()
  checkInCode?: string | null;

  @ApiPropertyOptional()
  lockedUntil?: Date | null;
}

export class BookingConfirmationDto {
  @ApiProperty()
  booking: BookingResponseDto;

  @ApiProperty()
  payment: Record<string, unknown>;

  @ApiProperty()
  lockExpiresAt: Date;

  @ApiProperty()
  message: string;
}

export class QrCodeResponseDto {
  @ApiProperty()
  bookingId: string;

  @ApiProperty({ description: 'Base64 data URL PNG QR code' })
  qrCodeDataUrl: string;

  @ApiProperty()
  checkInCode: string;

  @ApiProperty()
  payload: string;
}

export class RefundPreviewDto {
  @ApiProperty()
  refundPercent: number;

  @ApiProperty()
  refundAmount: number;

  @ApiProperty()
  policyLabel: string;

  @ApiProperty()
  hoursUntilSlot: number;
}
