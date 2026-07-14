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

  @ApiProperty({ description: 'True when player onboarding profile + sports are complete' })
  onboardingComplete: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;

  @ApiProperty({
    required: false,
    description: 'True when the account was created during this verification',
  })
  isNewUser?: boolean;
}

export class PermissionsResponseDto {
  @ApiProperty({ enum: Permission, isArray: true })
  permissions: Permission[];

  @ApiProperty({ enum: UserRole, isArray: true })
  roles: UserRole[];
}
