import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompletePlayerOnboardingDto {
  @ApiProperty({ example: 'Sriharsha' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional({ example: 'K' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: 'sriharsha@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: 'Hyderabad' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'file:///profile-photo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: ['Tennis', 'Badminton'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sports?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
