import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose, UserRole } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { REGISTERABLE_ROLES } from '../constants/auth.constants';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone: string;

  @ApiPropertyOptional({
    enum: OtpPurpose,
    example: OtpPurpose.LOGIN,
    description: 'Optional. When omitted, purpose is inferred from whether the phone is registered.',
  })
  @IsOptional()
  @IsEnum(OtpPurpose)
  purpose?: OtpPurpose;
}

export class PlayerSendOtpDto {
  @ApiProperty({ example: '9876543210', description: '10-digit Indian mobile or E.164' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone: string;
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

  @ApiPropertyOptional({ enum: OtpPurpose, example: OtpPurpose.LOGIN })
  @IsOptional()
  @IsEnum(OtpPurpose)
  purpose?: OtpPurpose;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Required for REGISTER purpose' })
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

  @ApiPropertyOptional({ example: 'device-uuid' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class PlayerVerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiPropertyOptional({ example: 'device-uuid' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class OtpSentResponseDto {
  @ApiProperty({ example: 'OTP sent successfully' })
  message: string;

  @ApiProperty({ example: 300, description: 'Expiry in seconds' })
  expiresIn: number;
}
