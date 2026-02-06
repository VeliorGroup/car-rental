import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PublicBookingsService } from './public-bookings.service';
import { CustomerJwtGuard } from '../public-auth/guards/customer-jwt.guard';
import {
  CreatePublicBookingDto,
  BookingPricingResponseDto,
  PublicBookingResponseDto,
} from './dto/public-bookings.dto';

@ApiTags('Public Bookings')
@Controller('public/bookings')
export class PublicBookingsController {
  constructor(private readonly bookingsService: PublicBookingsService) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Calculate pricing for a booking' })
  @ApiQuery({ name: 'vehicleId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, type: BookingPricingResponseDto })
  async calculatePricing(
    @Query('vehicleId') vehicleId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<BookingPricingResponseDto> {
    return this.bookingsService.calculatePricing(vehicleId, startDate, endDate);
  }

  @Post()
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new booking from marketplace' })
  @ApiResponse({ status: 201, type: PublicBookingResponseDto })
  @ApiResponse({ status: 400, description: 'Vehicle not available' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async createBooking(
    @Req() req: any,
    @Body() dto: CreatePublicBookingDto,
  ): Promise<PublicBookingResponseDto> {
    return this.bookingsService.createBooking(req.user.id, dto);
  }

  @Get('payment/callback')
  @ApiOperation({ summary: 'Handle Paysera payment callback' })
  async handlePaymentCallback(
    @Query('data') data: string,
    @Query('ss1') ss1: string,
  ) {
    // Decode Paysera callback data
    const decodedData = Buffer.from(
      data.replace(/_/g, '/').replace(/-/g, '+'),
      'base64',
    ).toString('utf-8');
    const params = new URLSearchParams(decodedData);
    const orderId = params.get('orderid');
    const status = params.get('status');

    if (!orderId) {
      return 'ERROR: Missing orderid';
    }

    return this.bookingsService.handlePaymentCallback(orderId, status || '0');
  }
}
