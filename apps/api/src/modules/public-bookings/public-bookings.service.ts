import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayseraService } from '../../common/services/paysera.service';
import { EmailService } from '../../common/services/email.service';
import { ConfigService } from '@nestjs/config';
import {
  CreatePublicBookingDto,
  BookingPricingResponseDto,
  PublicBookingResponseDto,
} from './dto/public-bookings.dto';
import { BookingStatus, PaymentStatus, PaymentType, VehicleStatus } from '@prisma/client';
import { differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { RedisCacheService } from '../../common/services/redis-cache.service';

@Injectable()
export class PublicBookingsService {
  private readonly logger = new Logger(PublicBookingsService.name);
  private readonly defaultPlatformFeePercent = 15;
  private readonly extraPrices: Record<string, number> = {
    GPS: 5,
    CHILD_SEAT: 8,
    ADDITIONAL_DRIVER: 10,
    FULL_INSURANCE: 15,
    WIFI: 3,
  };

  constructor(
    private prisma: PrismaService,
    private payseraService: PayseraService,
    private emailService: EmailService,
    private configService: ConfigService,
    private cacheService: RedisCacheService,
  ) {}

  async calculatePricing(
    vehicleId: string,
    startDate: string,
    endDate: string,
    extras?: { type: string; quantity: number }[],
  ): Promise<BookingPricingResponseDto> {
    // Get vehicle and tenant
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        tenant: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!vehicle || vehicle.deletedAt) {
      throw new NotFoundException('Vehicle not found');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = differenceInDays(end, start) || 1;

    // Get daily price from pricing table
    const dailyPrice = await this.getVehicleDailyPrice(vehicle.tenantId, vehicle.category);

    // Calculate extras
    const extrasBreakdown = (extras || []).map(e => ({
      type: e.type,
      quantity: e.quantity,
      unitPrice: this.extraPrices[e.type] || 0,
      total: (this.extraPrices[e.type] || 0) * e.quantity * days,
    }));
    const extrasTotal = extrasBreakdown.reduce((sum, e) => sum + e.total, 0);

    // Subtotal
    const subtotal = dailyPrice * days + extrasTotal;

    // Get platform fee percentage
    const settings = await this.getPlatformSettings();
    const platformFeePercent = settings?.platformFeePercent?.toNumber() || this.defaultPlatformFeePercent;
    
    const platformFee = subtotal * (platformFeePercent / 100);
    const tenantEarnings = subtotal - platformFee;

    return {
      dailyPrice,
      totalDays: days,
      subtotal,
      extras: extrasBreakdown,
      extrasTotal,
      platformFee: Math.round(platformFee * 100) / 100,
      tenantEarnings: Math.round(tenantEarnings * 100) / 100,
      totalAmount: Math.round(subtotal * 100) / 100,
    };
  }

  async createBooking(
    customerId: string,
    dto: CreatePublicBookingDto,
  ): Promise<PublicBookingResponseDto> {
    // Validate vehicle
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!vehicle || vehicle.deletedAt) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException('Vehicle is not available');
    }

    if (!vehicle.tenant.isActive) {
      throw new ForbiddenException('This rental company is not active');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates
    if (isBefore(startDate, new Date())) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    if (isBefore(endDate, startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate pricing
    const pricing = await this.calculatePricing(
      dto.vehicleId,
      dto.startDate,
      dto.endDate,
      dto.extras,
    );

    // Acquire distributed lock to prevent double booking
    const lockKey = `booking:vehicle:${dto.vehicleId}`;
    const lockAcquired = await this.cacheService.acquireLock(lockKey, 15);
    if (!lockAcquired) {
      throw new BadRequestException('Vehicle is being booked by another request. Please try again.');
    }

    let booking: { booking: any; orderId: string };
    try {
      // Create booking within transaction (availability check INSIDE transaction)
      booking = await this.prisma.$transaction(async (tx) => {
        // Check availability INSIDE transaction to prevent TOCTOU race condition
        const overlapping = await tx.booking.count({
          where: {
            vehicleId: dto.vehicleId,
            deletedAt: null,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_OUT] },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        });
        if (overlapping > 0) {
          throw new BadRequestException('Vehicle is not available for selected dates');
        }

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          tenantId: vehicle.tenantId,
          customerId,
          vehicleId: dto.vehicleId,
          startDate,
          endDate,
          status: BookingStatus.CONFIRMED,
          basePrice: pricing.subtotal,
          dailyPrice: pricing.dailyPrice,
          totalAmount: pricing.totalAmount,
          extras: JSON.parse(JSON.stringify(dto.extras || [])), // Cast to JSON
          cautionAmount: vehicle.franchiseAmount,
          pickupBranchId: dto.pickupBranchId || vehicle.branchId,
          dropoffBranchId: dto.dropoffBranchId || vehicle.branchId,
          notes: dto.notes,
          platformFee: pricing.platformFee,
          tenantEarnings: pricing.tenantEarnings,
          isPublicBooking: true,
          // createdById is null for public bookings
        },
        include: {
          vehicle: {
            select: { brand: true, model: true },
          },
          pickupBranch: {
            select: { name: true, address: true, city: true },
          },
          customer: {
            select: { email: true, firstName: true, lastName: true },
          },
          tenant: {
            select: { name: true, companyName: true },
          },
        },
      });

      // Create pending payment
      const orderId = `MP-${Date.now()}-${newBooking.id.substring(0, 8)}`;
      
      await tx.payment.create({
        data: {
          tenantId: vehicle.tenantId,
          bookingId: newBooking.id,
          amount: pricing.totalAmount,
          currency: 'EUR',
          status: PaymentStatus.PENDING,
          provider: 'PAYSERA',
          transactionId: orderId,
          type: PaymentType.FULL_PAYMENT,
          metadata: {
            platformFee: pricing.platformFee,
            tenantEarnings: pricing.tenantEarnings,
            isMarketplace: true,
          },
          // createdById is null for marketplace payments
        },
      });

      // Update vehicle status
      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: { status: VehicleStatus.RESERVED },
      });

      // Create notification for tenant
      await tx.notification.create({
        data: {
          tenantId: vehicle.tenantId,
          type: 'BOOKING',
          title: 'Nuova prenotazione dal Marketplace!',
          message: `${newBooking.customer.firstName} ${newBooking.customer.lastName} ha prenotato ${vehicle.brand} ${vehicle.model}`,
          entityId: newBooking.id,
          entityType: 'booking',
        },
      });

      return { booking: newBooking, orderId };
    });
    } finally {
      await this.cacheService.releaseLock(lockKey);
    }

    // Create Paysera payment URL
    const callbackUrl = `${this.configService.get('API_URL')}/api/v1/public/bookings/payment/callback`;
    const returnUrl = `${this.configService.get('FRONTEND_URL')}/customer/bookings/${booking.booking.id}/success`;
    const cancelUrl = `${this.configService.get('FRONTEND_URL')}/customer/bookings/${booking.booking.id}/cancel`;

    const payseraOrder = await this.payseraService.createOrder({
      amount: pricing.totalAmount * 100, // Paysera uses cents
      currency: 'EUR',
      order_id: booking.orderId,
      description: `Noleggio ${booking.booking.vehicle.brand} ${booking.booking.vehicle.model}`,
      email: booking.booking.customer.email,
      status: '2', // Immediate charge
      callback_url: callbackUrl,
      return_url: returnUrl,
    });

    // Send confirmation email to customer (non-blocking)
    this.sendBookingConfirmationEmail(booking.booking)
      .catch((err) => this.logger.error(`Failed to send booking confirmation email: ${err}`));

    // Send notification email to tenant (non-blocking)
    this.sendTenantNotificationEmail(booking.booking)
      .catch((err) => this.logger.error(`Failed to send tenant notification email: ${err}`));

    return {
      booking: {
        id: booking.booking.id,
        startDate: booking.booking.startDate,
        endDate: booking.booking.endDate,
        status: booking.booking.status,
        totalAmount: Number(booking.booking.totalAmount),
        platformFee: pricing.platformFee,
        vehicle: {
          brand: booking.booking.vehicle.brand,
          model: booking.booking.vehicle.model,
        },
        pickupBranch: booking.booking.pickupBranch,
      },
      paymentUrl: payseraOrder.url,
    };
  }

  async handlePaymentCallback(orderId: string, status: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionId: orderId },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Idempotency: skip if already processed
    if (payment.status === PaymentStatus.SUCCEEDED || payment.status === PaymentStatus.FAILED) {
      this.logger.log(`Payment ${orderId} already processed (status: ${payment.status}). Skipping.`);
      return 'OK';
    }

    if (status === '1') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCEEDED },
        });

        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });

        // Release vehicle
        await tx.vehicle.update({
          where: { id: payment.booking.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
      });
    }

    return 'OK';
  }

  private async checkAvailability(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const overlappingBookings = await this.prisma.booking.count({
      where: {
        vehicleId,
        deletedAt: null,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_OUT] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    return overlappingBookings === 0;
  }

  private async getVehicleDailyPrice(tenantId: string, category: string): Promise<number> {
    const now = new Date();
    const pricing = await this.prisma.vehiclePricing.findFirst({
      where: {
        tenantId,
        category: category as any,
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pricing ? pricing.dailyPrice.toNumber() : 50;
  }

  private async getPlatformSettings() {
    return this.prisma.platformSettings.findFirst();
  }

  private async sendBookingConfirmationEmail(booking: any) {
    await this.emailService.sendEmail({
      to: booking.customer.email,
      subject: `Prenotazione confermata - ${booking.vehicle.brand} ${booking.vehicle.model}`,
      html: `
        <h1>Prenotazione Confermata!</h1>
        <p>Ciao ${booking.customer.firstName},</p>
        <p>La tua prenotazione è stata confermata:</p>
        <ul>
          <li><strong>Veicolo:</strong> ${booking.vehicle.brand} ${booking.vehicle.model}</li>
          <li><strong>Data ritiro:</strong> ${booking.startDate.toLocaleDateString('it-IT')}</li>
          <li><strong>Data consegna:</strong> ${booking.endDate.toLocaleDateString('it-IT')}</li>
          <li><strong>Punto ritiro:</strong> ${booking.pickupBranch?.name}, ${booking.pickupBranch?.address}</li>
          <li><strong>Totale:</strong> €${booking.totalAmount}</li>
        </ul>
        <p>Noleggiatore: ${booking.tenant.companyName || booking.tenant.name}</p>
      `,
    });
  }

  private async sendTenantNotificationEmail(booking: any) {
    // Get tenant admin email
    const tenantAdmin = await this.prisma.user.findFirst({
      where: {
        tenantId: booking.tenantId,
        role: { name: 'ADMIN' },
      },
    });

    if (tenantAdmin) {
      await this.emailService.sendEmail({
        to: tenantAdmin.email,
        subject: `Nuova prenotazione Marketplace - ${booking.vehicle.brand} ${booking.vehicle.model}`,
        html: `
          <h1>Nuova Prenotazione dal Marketplace!</h1>
          <p>Hai ricevuto una nuova prenotazione:</p>
          <ul>
            <li><strong>Cliente:</strong> ${booking.customer.firstName} ${booking.customer.lastName}</li>
            <li><strong>Veicolo:</strong> ${booking.vehicle.brand} ${booking.vehicle.model}</li>
            <li><strong>Data ritiro:</strong> ${booking.startDate.toLocaleDateString('it-IT')}</li>
            <li><strong>Data consegna:</strong> ${booking.endDate.toLocaleDateString('it-IT')}</li>
            <li><strong>Totale:</strong> €${booking.totalAmount}</li>
          </ul>
          <p><a href="${this.configService.get('FRONTEND_URL')}/bookings/${booking.id}">Visualizza Prenotazione</a></p>
        `,
      });
    }
  }
}
