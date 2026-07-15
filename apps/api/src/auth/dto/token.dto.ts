import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '@fitora/types';
import { UserRole } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty({ enum: Permission, isArray: true })
  permissions: Permission[];

  @ApiProperty({ required: false })
  phone?: string | null;

  @ApiProperty({ required: false })
  avatarUrl?: string | null;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  phoneVerified: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;
}

export class SessionAuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Access token expiry in seconds' })
  expiresIn: number;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ example: false, description: 'True when OTP verification created a new player' })
  isNewUser: boolean;

  @ApiProperty({ example: false, description: 'True when the player should finish onboarding' })
  requiresOnboarding: boolean;
}

export class PermissionsResponseDto {
  @ApiProperty({ enum: Permission, isArray: true })
  permissions: Permission[];

  @ApiProperty({ enum: UserRole, isArray: true })
  roles: UserRole[];
}
