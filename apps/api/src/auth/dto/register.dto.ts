import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { REGISTERABLE_ROLES } from '../constants/auth.constants';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain uppercase, lowercase, and a number',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone?: string;

  @ApiProperty({
    enum: REGISTERABLE_ROLES,
    example: UserRole.PLAYER,
    description: 'Admin role cannot be self-assigned',
  })
  @IsEnum(UserRole)
  role: UserRole;
}

export class RegisterWithOtpDto extends RegisterDto {
  @ApiProperty({ example: '123456', description: 'OTP received via SMS' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
