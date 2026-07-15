import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, OtpPurpose } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';
import { REGISTERABLE_ROLES } from '../constants/auth.constants';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Required for REGISTER purpose',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ enum: REGISTERABLE_ROLES, example: UserRole.PLAYER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class OtpSentResponseDto {
  @ApiProperty({ example: 'OTP sent successfully' })
  message: string;

  @ApiProperty({ example: 300, description: 'Expiry in seconds' })
  expiresIn: number;
}

export class SendMobileOtpDto {
  @ApiProperty({ example: '+91' })
  @IsString()
  @Matches(/^\+?[1-9]\d{0,3}$/, { message: 'Invalid country code' })
  countryCode: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^\d{7,12}$/, { message: 'Invalid mobile number' })
  mobileNumber: string;
}

export class VerifyMobileOtpDto extends SendMobileOtpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiProperty({ example: 'ios-device-uuid' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'Sriharsha iPhone' })
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @ApiProperty({ example: 'ios' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiPropertyOptional({ example: 'iOS 18.2' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ example: 'Sriharsha' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '1995-05-20' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ example: 'https://cdn.fitora.com/profiles/user.jpg' })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
