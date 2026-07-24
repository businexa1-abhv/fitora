import { Body, Controller, Get, Inject, Patch, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { type Request } from 'express';
import { CurrentUser, Roles, type AuthUserPayload } from '../common/decorators';
import { CompletePlayerOnboardingDto } from './dto/complete-player-onboarding.dto';
import { UsersService, type UpdateProfileDto } from './users.service';

interface AuthRequest extends Request {
  user: { id: string; email: string; roles: UserRole[] };
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Req() req: AuthRequest) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (firstName, lastName, phone)' })
  updateMe(@CurrentUser() user: AuthUserPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/onboarding')
  @ApiOperation({ summary: 'Complete player onboarding after mobile OTP signup' })
  @ApiBody({ type: CompletePlayerOnboardingDto })
  completePlayerOnboarding(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CompletePlayerOnboardingDto,
  ) {
    return this.usersService.completePlayerOnboarding(user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  findAll() {
    return this.usersService.findAll();
  }
}
