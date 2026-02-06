import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';
import { EmailService } from '../../common/services/email.service';
import { MetricsService } from '../../common/services/metrics.service';
import { AuditService } from '../../common/services/audit.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { CreateBookingDto, UpdateBookingDto, BookingFilterDto, CheckoutDto, CheckinDto, CancelBookingDto, CalculatePriceDto } from './dto/create-booking.dto';
import { Booking, BookingStatus, CustomerStatus, VehicleStatus, CautionStatus, PaymentMethod, Prisma } from '@prisma/client';
import { addMinutes, differenceInDays, isToday, isAfter } from 'date-fns';
import { QueueService } from '../../common/queue/queue.service';
import { BOOKING_STATE_TRANSITIONS, BOOKING_DEFAULTS } from '../../common/constants/app.constants';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private metricsService: MetricsService,
    private auditService: AuditService,
    private queueService: QueueService,
    private cacheService: RedisCacheService,
  ) {}

  /**
   * Validate booking state transition
   */
  private validateStateTransition(currentStatus: string, newStatus: string): void {
    const allowedTransitions = BOOKING_STATE_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} -> ${newStatus}. Allowed: ${(allowedTransitions || []).join(', ') || 'none (terminal state)'}`,
      );
    }
  }

  async calculatePrice(tenantId: string, data: CalculatePriceDto): Promise<{
    dailyPrice: number;
    totalPrice: number;
    days: number;
    extras: { type: string; quantity: number; price: number; total: number }[];
    discount: number;
    finalPrice: number;
  }> {
    // Get vehicle pricing
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: data.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Get pricing for category and date range (tenant-scoped)
    const pricing = await this.prisma.vehiclePricing.findFirst({
      where: {
        tenantId,
        category: vehicle.category,
        validFrom: { lte: new Date(data.startDate) },
        validTo: { gte: new Date(data.endDate) },
      },
      orderBy: { validFrom: 'desc' },
    });

    if (!pricing) {
      throw new BadRequestException('No pricing available for this date range');
    }

    const dailyPrice = parseFloat(pricing.dailyPrice.toString());
    const days = differenceInDays(new Date(data.endDate), new Date(data.startDate)) + 1;
    let totalPrice = dailyPrice * days;

    // Calculate extras
    const extras = [];
    for (const extra of data.extras || []) {
      const extraPrice = parseFloat(extra.price || '0');
      const extraTotal = extraPrice * extra.quantity;
      extras.push({
        type: extra.type,
        quantity: extra.quantity,
        price: extraPrice,
        total: extraTotal,
      });
      totalPrice += extraTotal;
    }

    // Apply customer discount if applicable
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });

    let discount = 0;
    if (customer?.discountPercentage && customer.discountPercentage > 0) {
      discount = Math.min(totalPrice, totalPrice * (customer.discountPercentage / 100));
    }

    const finalPrice = Math.max(0, totalPrice - discount);

    return {
      dailyPrice,
      totalPrice,
      days,
      extras,
      discount,
      finalPrice,
    };
  }

  async create(tenantId: string, data: CreateBookingDto, userId: string): Promise<Booking> {
    // Validate customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.status !== CustomerStatus.ACTIVE) {
      throw new BadRequestException('Customer is not active');
    }

    if (new Date(customer.licenseExpiry) < new Date(data.endDate)) {
      throw new BadRequestException('Customer license expires before booking end');
    }

    // Validate vehicle
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: data.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException('Vehicle is not available');
    }

    // Acquire distributed lock on vehicle to prevent double booking
    const lockKey = `booking:vehicle:${data.vehicleId}`;
    const lockAcquired = await this.cacheService.acquireLock(lockKey, 15);
    if (!lockAcquired) {
      throw new ConflictException('Vehicle is being booked by another request. Please try again.');
    }

    let booking: Booking & { customer: any; vehicle: any };
    let price: any;
    try {
      // Calculate price if not provided or force recalculation
      if (data.dailyPrice && data.totalPrice) {
         price = {
          dailyPrice: data.dailyPrice,
          totalPrice: data.totalPrice,
          finalPrice: data.totalPrice,
          discount: 0,
          extras: data.extras || [],
         };
      } else {
        price = await this.calculatePrice(tenantId, {
          vehicleId: data.vehicleId,
          customerId: data.customerId,
          startDate: data.startDate,
          endDate: data.endDate,
          extras: data.extras,
        });
      }

      // Use transaction for atomicity: check overlap + create booking + update vehicle
      booking = await this.prisma.$transaction(async (tx) => {
        // Check overlap INSIDE transaction to prevent TOCTOU race condition
        const overlapping = await tx.booking.findFirst({
          where: {
            tenantId,
            vehicleId: data.vehicleId,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_OUT] },
            OR: [
              {
                startDate: { lte: new Date(data.endDate) },
                endDate: { gte: new Date(data.startDate) },
              },
            ],
          },
        });

        if (overlapping) {
          throw new BadRequestException('Vehicle is already booked for these dates');
        }

        const newBooking = await tx.booking.create({
          data: {
            tenantId,
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            basePrice: price.totalPrice,
            dailyPrice: price.dailyPrice,
            totalAmount: price.finalPrice,
            discountAmount: price.discount,
            extras: price.extras as Prisma.InputJsonValue,
            cautionAmount: data.cautionAmount || BOOKING_DEFAULTS.STANDARD_CAUTION,
            notes: data.notes,
            createdById: userId,
            status: BookingStatus.CONFIRMED,
          },
          include: {
            customer: true,
            vehicle: true,
          },
        });

        // Update vehicle status within same transaction
        await tx.vehicle.update({
          where: { id: data.vehicleId },
          data: { status: VehicleStatus.RESERVED },
        });

        return newBooking;
      });
    } finally {
      await this.cacheService.releaseLock(lockKey);
    }

    // Generate contract PDF (outside transaction - non-critical)
    let pdfKey: string | null = null;
    try {
      const pdfBuffer = await this.pdfService.generateContract(booking);
      pdfKey = await this.storageService.uploadBuffer(
        pdfBuffer,
        `bookings/${tenantId}/${booking.id}`,
        `contract-${booking.id}.pdf`,
        'application/pdf',
      );

      // Update booking with PDF key
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { pdfBookingKey: pdfKey },
      });
    } catch (error) {
      this.logger.error(`Failed to generate contract PDF for booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Send confirmation email (non-blocking)
    await this.queueService.add('booking-notifications', 'send-confirmation', {
      bookingId: booking.id,
      tenantId,
      customerId: data.customerId,
      pdfKey,
    }).catch((err) => this.logger.error(`Failed to queue confirmation email for booking ${booking.id}: ${err}`));

    // Record metric (non-blocking)
    await this.metricsService.recordEvent(tenantId, 'booking_created', 1, {
      vehicleCategory: vehicle.category,
      days: String(price.days),
      amount: String(price.finalPrice),
    }).catch((err) => this.logger.error(`Failed to record metric for booking ${booking.id}: ${err}`));

    // Audit log
    await this.auditService.log(tenantId, 'CREATE_BOOKING', 'Booking', booking.id, userId, null, booking);

    return booking;
  }

  async findAll(tenantId: string, filters: BookingFilterDto): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Search by customer name or vehicle plate
    if (filters.search) {
      where.OR = [
        { customer: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { vehicle: { licensePlate: { contains: filters.search, mode: 'insensitive' } } },
        { vehicle: { brand: { contains: filters.search, mode: 'insensitive' } } },
        { vehicle: { model: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.startFrom || filters.startTo) {
      where.startDate = {};
      if (filters.startFrom) where.startDate.gte = new Date(filters.startFrom);
      if (filters.startTo) where.startDate.lte = new Date(filters.startTo);
    }

    if (filters.endFrom || filters.endTo) {
      where.endDate = {};
      if (filters.endFrom) where.endDate.gte = new Date(filters.endFrom);
      if (filters.endTo) where.endDate.lte = new Date(filters.endTo);
    }

    const orderBy = { [filters.sortBy || 'createdAt']: filters.order || 'desc' };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              brand: true,
              model: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<any> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        vehicle: true,
        caution: true,
        damages: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Generate presigned URLs for PDFs if they exist
    const result: any = { ...booking };
    
    try {
      if (booking.pdfBookingKey) {
        result.pdfBookingUrl = await this.storageService.getPresignedUrl(booking.pdfBookingKey, 3600);
      }
      if (booking.pdfCheckOutKey) {
        result.pdfCheckOutUrl = await this.storageService.getPresignedUrl(booking.pdfCheckOutKey, 3600);
      }
      if (booking.pdfCheckInKey) {
        result.pdfCheckInUrl = await this.storageService.getPresignedUrl(booking.pdfCheckInKey, 3600);
      }
    } catch (error) {
      this.logger.error('Error generating presigned URLs:', error);
    }

    return result;
  }

  async update(tenantId: string, id: string, data: UpdateBookingDto, userId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Cannot modify bookings that are already checked out or completed
    const nonModifiableStatuses = ['CHECKED_OUT', 'CHECKED_IN', 'CANCELLED'];
    if (nonModifiableStatuses.includes(booking.status)) {
      throw new BadRequestException(`Cannot modify booking in ${booking.status} status`);
    }

    // Store old values for audit
    const oldValues = { ...booking };

    // If dates changed, validate and recalculate price
    let priceUpdate: any = {};
    if (data.startDate || data.endDate || data.extras) {
      const startDate = data.startDate || booking.startDate.toISOString();
      const endDate = data.endDate || booking.endDate.toISOString();
      const extras = data.extras || (booking.extras as any);

      // Check for overlapping bookings with new dates (excluding current booking, tenant-scoped)
      const overlapping = await this.prisma.booking.findFirst({
        where: {
          tenantId,
          vehicleId: booking.vehicleId,
          id: { not: id },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_OUT] },
          OR: [
            {
              startDate: { lte: new Date(endDate) },
              endDate: { gte: new Date(startDate) },
            },
          ],
        },
      });

      if (overlapping) {
        throw new BadRequestException('Vehicle is already booked for the new dates');
      }

      const price = await this.calculatePrice(tenantId, {
        vehicleId: booking.vehicleId,
        customerId: booking.customerId,
        startDate,
        endDate,
        extras,
      });

      priceUpdate = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        basePrice: price.totalPrice,
        dailyPrice: price.dailyPrice,
        totalAmount: price.finalPrice,
        discountAmount: price.discount,
        extras: price.extras as Prisma.InputJsonValue,
      };
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        ...data,
        ...priceUpdate,
      },
    });

    // Audit log
    await this.auditService.log(tenantId, 'UPDATE_BOOKING', 'Booking', id, userId, oldValues, updatedBooking);

    return updatedBooking;
  }

  async checkout(tenantId: string, id: string, data: CheckoutDto, userId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: { vehicle: true, customer: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate state transition via state machine
    this.validateStateTransition(booking.status, BookingStatus.CHECKED_OUT);

    // Validate checkout is not before booking start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(booking.startDate);
    startDate.setHours(0, 0, 0, 0);
    if (today < startDate) {
      throw new BadRequestException('Cannot checkout before booking start date');
    }

    // Validate km is greater than or equal to vehicle current km
    if (data.km < booking.vehicle.currentKm) {
      throw new BadRequestException(`Km cannot be less than vehicle current km (${booking.vehicle.currentKm})`);
    }

    // Payment method - now using correct enum value
    const paymentMethod = data.paymentMethod as PaymentMethod;

    // Create caution
    await this.prisma.caution.create({
      data: {
        tenantId,
        bookingId: id,
        amount: booking.cautionAmount,
        status: CautionStatus.PENDING,
        paymentMethod: paymentMethod,
        payseraOrderId: data.payseraOrderId,
      },
    });

    // Upload checkout photos
    const photoKeys: string[] = [];
    for (const photo of data.photos || []) {
      // In real implementation, these would be uploaded via presigned URLs
      photoKeys.push(photo);
    }

    // Generate checkout report
    const pdfBuffer = await this.pdfService.generateCheckoutReport(booking, data);
    const pdfKey = await this.storageService.uploadBuffer(
      pdfBuffer,
      `bookings/${tenantId}/${id}`,
      `checkout-report-${id}.pdf`,
      'application/pdf',
    );

    // Use transaction for atomicity: update booking + vehicle status
    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CHECKED_OUT,
          kmOut: data.km,
          fuelLevelOut: data.fuelLevel,
          checkOutData: {
            photos: photoKeys,
            signature: data.signature,
            km: data.km,
            fuelLevel: data.fuelLevel,
            timestamp: new Date().toISOString(),
            notes: data.notes,
          } as unknown as Prisma.InputJsonObject,
          pdfCheckOutKey: pdfKey,
        },
      });

      // Update vehicle status within same transaction
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: {
          status: VehicleStatus.RENTED,
          currentKm: data.km,
        },
      });

      return updated;
    });

    // Send checkout email
    await this.queueService.add('booking-notifications', 'send-checkout', {
      bookingId: id,
      tenantId,
      customerId: booking.customerId,
      pdfKey,
    });

    // Audit log
    await this.auditService.log(tenantId, 'CHECKOUT_BOOKING', 'Booking', id, userId, booking, updatedBooking);

    return updatedBooking;
  }

  async checkin(tenantId: string, id: string, data: CheckinDto, userId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: { vehicle: true, customer: true, caution: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate state transition via state machine
    this.validateStateTransition(booking.status, BookingStatus.CHECKED_IN);

    // Calculate extra charges (fuel, km, late return)
    // ... implementation details omitted for brevity ...

    // Upload checkin photos
    const photoKeys: string[] = [];
    for (const photo of data.photos || []) {
      photoKeys.push(photo);
    }

    // Generate checkin report
    // const pdfBuffer = await this.pdfService.generateCheckinReport(booking, data);
    // const pdfKey = await this.storageService.uploadBuffer(
    //   pdfBuffer,
    //   `bookings/${tenantId}/${id}`,
    //   `checkin-report-${id}.pdf`,
    //   'application/pdf',
    // );

    // Generate checkin report PDF
    let pdfCheckInKey: string | null = null;
    try {
      const pdfBuffer = await (this.pdfService as any).generateCheckinReport(booking, data);
      pdfCheckInKey = await this.storageService.uploadBuffer(
        pdfBuffer,
        `bookings/${tenantId}/${id}`,
        `checkin-report-${id}.pdf`,
        'application/pdf',
      );
    } catch (error) {
      this.logger.error(`Failed to generate check-in PDF for booking ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Use transaction for atomicity: update booking + vehicle status
    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CHECKED_IN,
          kmIn: data.km,
          fuelLevelIn: data.fuelLevel,
          checkInData: {
            photos: photoKeys,
            signature: data.signature,
            km: data.km,
            fuelLevel: data.fuelLevel,
            damages: data.newDamages,
            timestamp: new Date().toISOString(),
            notes: data.notes,
          } as unknown as Prisma.InputJsonObject,
          pdfCheckInKey: pdfCheckInKey,
        },
      });

      // Update vehicle status within same transaction
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: {
          status: VehicleStatus.AVAILABLE,
          currentKm: data.km,
        },
      });

      return updated;
    });

    // Handle caution release if no damages
    if ((!data.newDamages || data.newDamages.length === 0) && booking.caution) {
      // Auto-release caution or mark for release
      // await this.cautionsService.release(...)
    }

    // Audit log
    await this.auditService.log(tenantId, 'CHECKIN_BOOKING', 'Booking', id, userId, booking, updatedBooking);

    return updatedBooking;
  }

  async cancel(tenantId: string, id: string, reason: string, userId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate state transition via state machine
    this.validateStateTransition(booking.status, BookingStatus.CANCELLED);

    // Calculate cancellation fee
    let cancellationFee = 0;
    const hoursUntilStart = (new Date(booking.startDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilStart < 24) {
      // Less than 24h before start: apply cancellation fee
      cancellationFee = Number(booking.totalAmount) * (BOOKING_DEFAULTS.CANCELLATION_FEE_PERCENT / 100);
    }

    // Use transaction for atomicity: cancel booking + release vehicle
    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: 'CUSTOMER_REQUEST',
          notes: reason ? `${booking.notes || ''}\nCancellation reason: ${reason}` : booking.notes,
        },
      });

      // Release vehicle within same transaction
      await tx.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      return updated;
    });

    // Audit log
    await this.auditService.log(tenantId, 'CANCEL_BOOKING', 'Booking', id, userId, booking, updatedBooking);

    return updatedBooking;
  }

  async generateContract(tenantId: string, id: string): Promise<Buffer> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: { customer: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.pdfService.generateContract(booking);
  }

  async generateAndSaveContract(tenantId: string, id: string, userId: string): Promise<{ pdfBookingKey: string }> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: { customer: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Generate PDF
    const pdfBuffer = await this.pdfService.generateContract(booking);
    
    // Upload to storage
    const pdfKey = await this.storageService.uploadBuffer(
      pdfBuffer,
      `bookings/${tenantId}/${id}`,
      `contract-${id}.pdf`,
      'application/pdf',
    );

    // Update booking with PDF key
    await this.prisma.booking.update({
      where: { id },
      data: { pdfBookingKey: pdfKey },
    });

    // Audit log
    await this.auditService.log(tenantId, 'GENERATE_CONTRACT', 'Booking', id, userId, null, { pdfBookingKey: pdfKey });

    return { pdfBookingKey: pdfKey };
  }

  async remove(tenantId: string, id: string, userId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Optional: Check if booking can be deleted (e.g. status)
    // For now, we allow admin/manager to delete any booking, 
    // assuming Prisma cascade delete or manual handling isn't strictly enforced yet.

    await this.prisma.booking.delete({
      where: { id },
    });

    await this.auditService.log(tenantId, 'DELETE_BOOKING', 'Booking', id, userId, booking, null);
  }

  async getStatsSummary(tenantId: string, startFrom?: string, startTo?: string): Promise<any> {
    // Use selected period or default to today
    const periodStart = startFrom ? new Date(startFrom) : new Date(new Date().setHours(0, 0, 0, 0));
    const periodEnd = startTo ? new Date(startTo) : new Date(new Date().setHours(23, 59, 59, 999));

    // Build date filter for bookings
    const dateFilter: any = {};
    if (startFrom) {
      dateFilter.startDate = { ...dateFilter.startDate, gte: new Date(startFrom) };
    }
    if (startTo) {
      dateFilter.startDate = { ...dateFilter.startDate, lte: new Date(startTo) };
    }

    const baseWhere = { tenantId, ...dateFilter };

    const [total, byStatus, pickups, returns] = await Promise.all([
      this.prisma.booking.count({ where: baseWhere }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      // Pickups in period: bookings that start in the selected period
      this.prisma.booking.count({
        where: {
          tenantId,
          startDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: { not: BookingStatus.CANCELLED },
        },
      }),
      // Returns in period: bookings that end in the selected period
      this.prisma.booking.count({
        where: {
          tenantId,
          endDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: { not: BookingStatus.CANCELLED },
        },
      }),
    ]);

    // Initialize all statuses with 0
    const allStatuses: Record<string, number> = {
      CONFIRMED: 0,
      CHECKED_OUT: 0,
      CHECKED_IN: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };

    // Fill in actual counts
    byStatus.forEach((item) => {
      allStatuses[item.status] = item._count.status;
    });

    return {
      total,
      status: allStatuses,
      pickups,
      returns,
    };
  }
}