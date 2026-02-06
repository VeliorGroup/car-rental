import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RegisterTenantDto, TwoFADto, TwoFAVerifyDto, TwoFADisableDto, ChangePasswordDto, ResetPasswordRequestDto, ResetPasswordDto, UpdateProfileDto, AuthResponseDto, TwoFASecretDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ThrottleCustom } from '../../common/decorators/throttle-custom.decorator';
import { RATE_LIMIT } from '../../common/constants/app.constants';
import { UserRole } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ThrottleCustom(RATE_LIMIT.LOGIN)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: '2FA required' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, tenantId, ipAddress, userAgent);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    return this.authService.register(registerDto, tenantId);
  }

  @Public()
  @Post('register-tenant')
  @ApiOperation({ summary: 'Register new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 400, description: 'User or Tenant already exists' })
  async registerTenant(@Body() registerDto: RegisterTenantDto) {
    return this.authService.registerTenant(registerDto);
  }

  @Public()
  @Get('countries')
  @ApiOperation({ summary: 'Get supported countries with currencies' })
  @ApiResponse({ status: 200, description: 'List of supported countries' })
  async getCountries() {
    const { getSupportedCountries, SUPPORTED_CURRENCIES } = await import('../../common/utils/vat-validator');
    return {
      countries: getSupportedCountries(),
      currencies: SUPPORTED_CURRENCIES,
    };
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA secret generated' })
  @ApiBearerAuth()
  async enable2FA(@Req() req: any): Promise<TwoFASecretDto> {
    return this.authService.enable2FA(req.user.id);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify 2FA setup' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiBearerAuth()
  async verify2FA(@Body() verifyDto: TwoFAVerifyDto, @Req() req: any): Promise<void> {
    return this.authService.verify2FA(req.user.id, verifyDto);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiBearerAuth()
  async disable2FA(@Body() disableDto: TwoFADisableDto, @Req() req: any): Promise<void> {
    return this.authService.disable2FA(req.user.id, disableDto);
  }

  @Post('2fa/backup')
  @Public()
  @ThrottleCustom(RATE_LIMIT.BACKUP_CODE)
  @ApiOperation({ summary: 'Login with backup code' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid backup code' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async useBackupCode(@Body() backupCodeDto: { email: string; backupCode: string }): Promise<AuthResponseDto> {
    const user = await this.authService.validateUser(backupCodeDto.email, 'dummy'); // Will validate backup code instead
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.useBackupCode(user.id, backupCodeDto.backupCode);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiBearerAuth()
  async changePassword(@Body() changeDto: ChangePasswordDto, @Req() req: any): Promise<void> {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.changePassword(req.user.id, changeDto, ipAddress, userAgent);
  }

  @Public()
  @Post('password/reset-request')
  @ThrottleCustom(RATE_LIMIT.PASSWORD_RESET)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  @ApiResponse({ status: 429, description: 'Too many reset requests' })
  async requestPasswordReset(@Body() resetDto: ResetPasswordRequestDto): Promise<void> {
    return this.authService.requestPasswordReset(resetDto);
  }

  @Public()
  @Post('password/reset')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetDto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(resetDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiBearerAuth()
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiBearerAuth()
  async updateProfile(@Body() updateDto: UpdateProfileDto, @Req() req: any) {
    return this.authService.updateProfile(req.user.id, updateDto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiBearerAuth()
  async uploadAvatar(@Req() req: any, @Body() body: { avatar: string }) {
    // For now, accept base64 or URL - in production you'd use file upload
    return this.authService.updateAvatar(req.user.id, body.avatar);
  }

  @Put('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update profile avatar URL' })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  @ApiBearerAuth()
  async updateAvatar(@Req() req: any, @Body() body: { avatar: string }) {
    return this.authService.updateAvatar(req.user.id, body.avatar);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout user' })
  @ApiBearerAuth()
  async logout(@Req() req: any): Promise<void> {
    // In a real app, you might want to blacklist the token
    // For now, just return 204
    return;
  }
}