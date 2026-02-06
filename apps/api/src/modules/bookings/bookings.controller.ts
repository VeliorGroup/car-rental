import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto, BookingFilterDto, CalculatePriceDto, CheckoutDto, CheckinDto } from './dto/create-booking.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingStatus } from '@prisma/client';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
export class BookingsController {

  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  create(@Req() req: Request, @Body() createBookingDto: CreateBookingDto) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.bookingsService.create(tenantId, createBookingDto, userId);
  }

  @Post('calculate-price')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Calculate booking price' })
  calculatePrice(@Req() req: Request, @Body() calculatePriceDto: CalculatePriceDto) {
    const tenantId = req.user!.tenantId;
    return this.bookingsService.calculatePrice(tenantId, calculatePriceDto);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Get all bookings with filters' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  @ApiQuery({ name: 'startFrom', required: false })
  @ApiQuery({ name: 'startTo', required: false })
  @ApiQuery({ name: 'endFrom', required: false })
  @ApiQuery({ name: 'endTo', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async findAll(@Query() filters: BookingFilterDto, @Req() req: Request) {
    const tenantId = req.user!.tenantId;
    return this.bookingsService.findAll(tenantId, filters);
  }

  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get booking statistics summary' })
  @ApiQuery({ name: 'startFrom', required: false })
  @ApiQuery({ name: 'startTo', required: false })
  async getStatsSummary(
    @Req() req: Request,
    @Query('startFrom') startFrom?: string,
    @Query('startTo') startTo?: string,
  ) {
    const tenantId = req.user!.tenantId;
    return this.bookingsService.getStatsSummary(tenantId, startFrom, startTo);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Get booking details' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.user!.tenantId;
    return this.bookingsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Update booking' })
  update(@Req() req: Request, @Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.bookingsService.update(tenantId, id, updateBookingDto, userId);
  }

  @Post(':id/checkout')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Process vehicle checkout' })
  checkout(@Req() req: Request, @Param('id') id: string, @Body() checkoutDto: CheckoutDto) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.bookingsService.checkout(tenantId, id, checkoutDto, userId);
  }

  @Post(':id/checkin')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Process vehicle checkin' })
  checkin(@Req() req: Request, @Param('id') id: string, @Body() checkinDto: CheckinDto) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.bookingsService.checkin(tenantId, id, checkinDto, userId);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Cancel booking' })
  cancel(@Req() req: Request, @Param('id') id: string, @Body() body: { reason: string }) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.bookingsService.cancel(tenantId, id, body.reason, userId);
  }

  @Post(':id/generate-contract')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Generate and save booking contract PDF' })
  @ApiResponse({ status: 200, description: 'Contract generated and saved successfully' })
  async generateAndSaveContract(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.bookingsService.generateAndSaveContract(tenantId, id, userId);
  }

  @Get(':id/contract')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Get booking contract PDF' })
  async getContract(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.user!.tenantId;
    const pdfBuffer = await this.bookingsService.generateContract(tenantId, id);
    return new Uint8Array(pdfBuffer);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiResponse({ status: 204, description: 'Booking deleted successfully' })
  remove(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.bookingsService.remove(tenantId, id, userId);
  }
}
