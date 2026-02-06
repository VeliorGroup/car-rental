import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PublicAuthService } from './public-auth.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { ThrottleCustom } from '../../common/decorators/throttle-custom.decorator';
import { RATE_LIMIT } from '../../common/constants/app.constants';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  UploadDocumentsDto,
  CustomerAuthResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
} from './dto/public-auth.dto';

@ApiTags('Public Auth')
@Controller('public/auth')
export class PublicAuthController {
  constructor(private readonly authService: PublicAuthService) {}

  @Post('register')
  @ThrottleCustom(RATE_LIMIT.REGISTER)
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, type: CustomerAuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterCustomerDto): Promise<CustomerAuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ThrottleCustom(RATE_LIMIT.LOGIN)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: CustomerAuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginCustomerDto): Promise<CustomerAuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current customer profile' })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer profile' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateCustomerProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('documents')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload license and ID documents info' })
  async uploadDocuments(@Req() req: any, @Body() dto: UploadDocumentsDto) {
    return this.authService.uploadDocuments(req.user.id, dto);
  }

  @Get('bookings')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer booking history' })
  async getBookingHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.authService.getBookingHistory(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Post('forgot-password')
  @ThrottleCustom(RATE_LIMIT.PASSWORD_RESET)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ResetPasswordRequestDto) {
    await this.authService.requestPasswordReset(dto);
    return { message: 'If an account exists, a reset email has been sent' };
  }

  @Post('reset-password')
  @ThrottleCustom(RATE_LIMIT.PASSWORD_RESET)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully' };
  }
}
