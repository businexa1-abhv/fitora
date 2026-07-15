import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PartnerBusinessDto {
  @ApiProperty({ example: 'Alex Rivera' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  ownerName: string;

  @ApiProperty({ example: 'Smash Arena Bangalore' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessName: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'owner@smasharena.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: '12 MG Road, Indiranagar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  venueAddress: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '560038' })
  @IsString()
  @Matches(/^\d{6}$/)
  pincode: string;
}

export class PartnerVenueDto {
  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: ['badminton', 'cricket'] })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  sports: string[];

  @ApiPropertyOptional({ example: 'Synthetic Turf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  courtType?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  courtCount?: number;

  @ApiPropertyOptional({ example: ['Ample Parking', 'Fully Air Conditioned'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    example: { openTime: '06:00', closeTime: '22:00', days: [1, 2, 3, 4, 5, 6, 0] },
  })
  @IsOptional()
  @IsObject()
  operationalHours?: Record<string, unknown>;
}

export class PartnerSportConfigItemDto {
  @ApiProperty({ example: 'badminton' })
  @IsString()
  @IsNotEmpty()
  sportSlug: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  courtCount: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPlayers?: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  standardRate: number;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  memberRate?: number;

  @ApiPropertyOptional({ example: [60, 90, 120] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  slotIntervals?: number[];
}

export class PartnerSportsConfigDto {
  @ApiProperty({ type: [PartnerSportConfigItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerSportConfigItemDto)
  items: PartnerSportConfigItemDto[];
}

export class PartnerTrainerDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ example: 'badminton' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  specialization: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ example: '9876501234' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @ApiPropertyOptional({ example: '123456789012' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  aadhaar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}

export class PartnerTrainersDto {
  @ApiProperty({ type: [PartnerTrainerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerTrainerDto)
  trainers: PartnerTrainerDto[];
}

export class PartnerLegalDto {
  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gstNumber?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  panNumber?: string;

  @ApiPropertyOptional({ example: '123456789012' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  aadhaarNumber?: string;

  @ApiPropertyOptional({ example: '50100123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ifscCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessLicenseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  identityProofUrl?: string;
}

export class PartnerVisualsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  exteriorUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receptionUrl?: string;

  @ApiPropertyOptional({ example: ['https://cdn.fitora.com/courts/1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courtPhotoUrls?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;
}

export class PartnerVerifyPhoneDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  otp: string;
}

export class PartnerSubmitDto {
  @ApiPropertyOptional({
    description: 'Optional password; a secure password is generated if omitted',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
