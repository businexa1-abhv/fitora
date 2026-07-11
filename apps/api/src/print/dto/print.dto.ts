import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PrintOrderStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TSHIRT_SIZES } from '../print.constants';

export class UploadDesignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'Base64-encoded file content (without data URL prefix)' })
  @IsString()
  @IsNotEmpty()
  dataBase64!: string;
}

export class CreatePrintListingDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  turnaroundDays?: number;
}

export class UpdatePrintListingDto extends PartialType(CreatePrintListingDto) {
  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class CreatePrintOrderDto {
  @ApiProperty()
  @IsString()
  designUrl!: string;

  @ApiProperty({ enum: TSHIRT_SIZES })
  @IsString()
  tshirtSize!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tshirtColor?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customText?: string;

  @ApiProperty()
  @IsString()
  pickupAddress!: string;

  @ApiProperty()
  @IsString()
  pickupPhone!: string;

  @ApiProperty()
  @IsString()
  pickupCity!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;
}

export class UpdatePrintOrderStatusDto {
  @ApiProperty({ enum: PrintOrderStatus })
  @IsEnum(PrintOrderStatus)
  status!: PrintOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  proofUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class ApproveDesignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;
}

export class RejectDesignDto {
  @ApiProperty()
  @IsString()
  @Min(5)
  @MaxLength(1000)
  reason!: string;
}
