import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { REGISTERABLE_ROLES } from '../constants/auth.constants';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID token from client-side OAuth' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({
    enum: REGISTERABLE_ROLES,
    example: UserRole.PLAYER,
    description: 'Role for new user registration via Google',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
