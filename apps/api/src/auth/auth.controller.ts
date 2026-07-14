import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type Request } from 'express';
import { CurrentUser, Public, type AuthUserPayload } from '../common/decorators';
import { type AuthService } from './auth.service';
import {
  AuthResponseDto,
  type ChangePasswordDto,
  type ForgotPasswordDto,
  type GoogleLoginDto,
  type LoginDto,
  MessageResponseDto,
  OtpSentResponseDto,
  PermissionsResponseDto,
  type PhoneLoginDto,
  type RefreshTokenDto,
  type RegisterDto,
  type RegisterWithOtpDto,
  type ResetPasswordDto,
  type SendMobileOtpDto,
  type SendOtpDto,
  SessionAuthResponseDto,
  type VerifyMobileOtpDto,
  type VerifyOtpDto,
} from './dto';

function extractMeta(req: Request) {
  const userAgent = req.headers['user-agent'];

  return {
    ipAddress: req.ip,
    userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register with email and password' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('register/otp')
  @ApiOperation({ summary: 'Register with phone OTP verification' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  registerWithOtp(@Body() dto: RegisterWithOtpDto) {
    return this.authService.registerWithOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, extractMeta(req));
  }

  @Public()
  @Post('login/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with phone OTP' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  loginWithPhone(@Body() dto: PhoneLoginDto, @Req() req: Request) {
    return this.authService.loginWithPhone(dto, extractMeta(req));
  }

  @Public()
  @Post('login/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google OAuth ID token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  loginWithGoogle(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.authService.loginWithGoogle(dto, extractMeta(req));
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiResponse({ status: 200, type: OtpSentResponseDto })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send login OTP to a player mobile number' })
  @ApiResponse({ status: 200, type: OtpSentResponseDto })
  sendMobileOtp(@Body() dto: SendMobileOtpDto) {
    return this.authService.sendMobileOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP — login, register, or verify phone',
    description:
      'Returns AuthResponse for LOGIN/REGISTER purposes; MessageResponse for VERIFY_PHONE',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify player OTP and create a device session' })
  @ApiResponse({ status: 200, type: SessionAuthResponseDto })
  verifyMobileOtp(@Body() dto: VerifyMobileOtpDto, @Req() req: Request) {
    return this.authService.verifyMobileOtp(dto, extractMeta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, extractMeta(req));
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and return a new mobile token pair' })
  @ApiResponse({ status: 200, type: SessionAuthResponseDto })
  refreshMobile(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshMobile(dto.refreshToken, extractMeta(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from all devices (revoke all refresh tokens)' })
  logoutAll(@CurrentUser() user: AuthUserPayload, @Req() req: Request) {
    return this.authService.logoutAll(user.id, extractMeta(req));
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from all devices (alias for logout/all)' })
  logoutAllAlias(@CurrentUser() user: AuthUserPayload, @Req() req: Request) {
    return this.authService.logoutAll(user.id, extractMeta(req));
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  changePassword(@CurrentUser() user: AuthUserPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  getMe(@CurrentUser() user: AuthUserPayload) {
    return this.authService.getMe(user.id);
  }

  @Get('permissions')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user roles and permissions' })
  @ApiResponse({ status: 200, type: PermissionsResponseDto })
  getPermissions(@CurrentUser() user: AuthUserPayload) {
    return this.authService.getPermissions(user.id);
  }
}
