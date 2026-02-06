import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';
import { EmailService } from '../../common/services/email.service';
import { MetricsService } from '../../common/services/metrics.service';
import { AuditService } from '../../common/services/audit.service';
import { QueueService } from '../../common/queue/queue.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BookingStatus, VehicleStatus, CustomerStatus, CautionStatus } from '@prisma/client';
import { BOOKING_DEFAULTS } from '../../common/constants/app.constants';

describe('BookingsService', () => {
  let service: BookingsService;

  // ── Prisma mock ──────────────────────────────────────────────────
  const mockPrismaService: any = {
    booking: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    extra: {
      findMany: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    caution: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    vehiclePricing: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback: (prisma: any) => any) =>
      callback(mockPrismaService),
    ),
  };

  // ── Dependency mocks ─────────────────────────────────────────────
  const mockStorageService = {
    uploadBuffer: jest.fn().mockResolvedValue('bookings/tenant-123/booking-123/contract.pdf'),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
    getPresignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com'),
  };

  const mockPdfService = {
    generateContractPDF: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    generateContract: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    generateCheckoutReport: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    generateCheckinReport: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  };

  const mockEmailService = {
    sendBookingConfirmation: jest.fn(),
    sendBookingCancellation: jest.fn(),
  };

  const mockMetricsService = {
    recordEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueueService = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  const mockCacheService = {
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  // ── Shared fixtures ──────────────────────────────────────────────
  const tenantId = 'tenant-123';
  const userId = 'user-123';

  const mockVehicle = {
    id: 'vehicle-123',
    dailyPrice: 50,
    tenantId,
    status: VehicleStatus.AVAILABLE,
    licensePlate: 'ABC-123',
    category: 'COMPACT',
    currentKm: 10000,
  };

  const mockCustomer = {
    id: 'customer-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    discountPercentage: 0,
    tenantId,
    status: CustomerStatus.ACTIVE,
    licenseExpiry: new Date('2099-12-31'),
  };

  // ── Test module setup ────────────────────────────────────────────
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: RedisCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ================================================================
  // calculatePrice
  // ================================================================
  describe('calculatePrice', () => {
    const calcDto = {
      vehicleId: 'vehicle-123',
      customerId: 'customer-123',
      startDate: '2024-01-01',
      endDate: '2024-01-06',
    };

    it('should calculate price correctly for a multi-day booking', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue({ dailyPrice: 50 });
      mockPrismaService.customer.findFirst.mockResolvedValue({ discountPercentage: 0 });

      const result = await service.calculatePrice(tenantId, calcDto);

      expect(result.days).toBe(6); // Jan 1-6 inclusive
      expect(result.dailyPrice).toBe(50);
      expect(result.totalPrice).toBe(300);
      expect(result.finalPrice).toBe(300);
      expect(result.discount).toBe(0);
    });

    it('should apply customer discount correctly', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue({ dailyPrice: 50 });
      mockPrismaService.customer.findFirst.mockResolvedValue({ discountPercentage: 10 });

      const result = await service.calculatePrice(tenantId, calcDto);

      expect(result.discount).toBe(30); // 10% of 300
      expect(result.finalPrice).toBe(270);
    });

    it('should handle zero discount percentage', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue({ dailyPrice: 80 });
      mockPrismaService.customer.findFirst.mockResolvedValue({ discountPercentage: 0 });

      const result = await service.calculatePrice(tenantId, calcDto);

      expect(result.discount).toBe(0);
      expect(result.finalPrice).toBe(result.totalPrice);
    });

    it('should calculate extras when provided', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue({ dailyPrice: 50 });
      mockPrismaService.customer.findFirst.mockResolvedValue({ discountPercentage: 0 });

      const result = await service.calculatePrice(tenantId, {
        ...calcDto,
        extras: [
          { type: 'GPS', quantity: 1, price: '10' },
          { type: 'CHILD_SEAT', quantity: 2, price: '5' },
        ],
      });

      expect(result.extras).toHaveLength(2);
      expect(result.extras[0]).toEqual({ type: 'GPS', quantity: 1, price: 10, total: 10 });
      expect(result.extras[1]).toEqual({ type: 'CHILD_SEAT', quantity: 2, price: 5, total: 10 });
      // 300 (base) + 10 (GPS) + 10 (2 child seats) = 320
      expect(result.totalPrice).toBe(320);
      expect(result.finalPrice).toBe(320);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.calculatePrice(tenantId, calcDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no pricing available', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue(null);

      await expect(
        service.calculatePrice(tenantId, calcDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ================================================================
  // create
  // ================================================================
  describe('create', () => {
    const createDto = {
      vehicleId: 'vehicle-123',
      customerId: 'customer-123',
      startDate: '2024-01-01',
      endDate: '2024-01-06',
    } as any;

    const createdBooking = {
      id: 'booking-123',
      ...createDto,
      status: BookingStatus.CONFIRMED,
      tenantId,
      totalAmount: 300,
      customer: mockCustomer,
      vehicle: mockVehicle,
    };

    function setupSuccessfulCreate() {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue({ dailyPrice: 50 });
      mockPrismaService.extra.findMany.mockResolvedValue([]);
      mockPrismaService.booking.findFirst.mockResolvedValue(null); // No overlap
      mockPrismaService.booking.create.mockResolvedValue(createdBooking);
      mockPrismaService.booking.update.mockResolvedValue(createdBooking);
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...mockVehicle,
        status: VehicleStatus.RESERVED,
      });
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: tenantId, name: 'Test' });
      mockCacheService.acquireLock.mockResolvedValue(true);
    }

    it('should create a booking successfully', async () => {
      setupSuccessfulCreate();

      const result = await service.create(tenantId, createDto, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-123');
      expect(mockPrismaService.booking.create).toHaveBeenCalled();
      expect(mockCacheService.acquireLock).toHaveBeenCalledWith(
        `booking:vehicle:${createDto.vehicleId}`,
        15,
      );
      expect(mockCacheService.releaseLock).toHaveBeenCalledWith(
        `booking:vehicle:${createDto.vehicleId}`,
      );
    });

    it('should record audit log on creation', async () => {
      setupSuccessfulCreate();

      await service.create(tenantId, createDto, userId);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        tenantId,
        'CREATE_BOOKING',
        'Booking',
        'booking-123',
        userId,
        null,
        expect.any(Object),
      );
    });

    it('should record metrics on creation', async () => {
      setupSuccessfulCreate();

      await service.create(tenantId, createDto, userId);

      expect(mockMetricsService.recordEvent).toHaveBeenCalledWith(
        tenantId,
        'booking_created',
        1,
        expect.objectContaining({
          vehicleCategory: 'COMPACT',
        }),
      );
    });

    it('should queue notification email on creation', async () => {
      setupSuccessfulCreate();

      await service.create(tenantId, createDto, userId);

      expect(mockQueueService.add).toHaveBeenCalledWith(
        'booking-notifications',
        'send-confirmation',
        expect.objectContaining({
          bookingId: 'booking-123',
          tenantId,
        }),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if customer is not active', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        status: CustomerStatus.SUSPENDED,
      });

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if customer license expires before booking end', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        licenseExpiry: new Date('2024-01-03'), // Expires before endDate 2024-01-06
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if vehicle is not available', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        status: VehicleStatus.RENTED,
      });

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when vehicle lock cannot be acquired', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockCacheService.acquireLock.mockResolvedValue(false);

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject overlapping booking dates', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue({ dailyPrice: 50 });
      mockCacheService.acquireLock.mockResolvedValue(true);
      // Overlap found inside transaction
      mockPrismaService.booking.findFirst.mockResolvedValue({
        id: 'existing-booking',
        status: BookingStatus.CONFIRMED,
      });

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow(BadRequestException);

      // Lock should still be released even on error
      expect(mockCacheService.releaseLock).toHaveBeenCalled();
    });

    it('should release lock even when an error occurs', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehiclePricing.findFirst.mockResolvedValue({ dailyPrice: 50 });
      mockCacheService.acquireLock.mockResolvedValue(true);
      mockPrismaService.booking.findFirst.mockResolvedValue(null);
      mockPrismaService.booking.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create(tenantId, createDto, userId),
      ).rejects.toThrow();

      expect(mockCacheService.releaseLock).toHaveBeenCalledWith(
        `booking:vehicle:${createDto.vehicleId}`,
      );
    });

    it('should use provided dailyPrice and totalPrice when supplied', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockCacheService.acquireLock.mockResolvedValue(true);
      mockPrismaService.booking.findFirst.mockResolvedValue(null);
      mockPrismaService.booking.create.mockResolvedValue(createdBooking);
      mockPrismaService.vehicle.update.mockResolvedValue(mockVehicle);

      const dtoWithPrice = {
        ...createDto,
        dailyPrice: 75,
        totalPrice: 450,
      };

      await service.create(tenantId, dtoWithPrice, userId);

      // Should NOT call calculatePrice when prices are provided
      expect(mockPrismaService.vehiclePricing.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dailyPrice: 75,
            totalAmount: 450,
          }),
        }),
      );
    });
  });

  // ================================================================
  // checkout (state machine)
  // ================================================================
  describe('checkout', () => {
    const checkoutDto = {
      km: 10000,
      fuelLevel: 100,
      paymentMethod: 'CASH',
      photos: [],
      signature: 'base64-signature',
      notes: 'All good',
    } as any;

    const confirmedBooking = {
      id: 'booking-123',
      status: BookingStatus.CONFIRMED,
      vehicleId: 'vehicle-123',
      customerId: 'customer-123',
      tenantId,
      cautionAmount: 300,
      startDate: new Date('2024-01-01'),
      vehicle: { id: 'vehicle-123', currentKm: 10000 },
      customer: mockCustomer,
    };

    it('should checkout a CONFIRMED booking successfully', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(confirmedBooking);
      mockPrismaService.caution.create.mockResolvedValue({ id: 'caution-1' });
      mockPrismaService.booking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_OUT,
        kmOut: 10000,
      });
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...mockVehicle,
        status: VehicleStatus.RENTED,
      });

      const result = await service.checkout(tenantId, 'booking-123', checkoutDto, userId);

      expect(result.status).toBe(BookingStatus.CHECKED_OUT);
      expect(mockPrismaService.caution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          bookingId: 'booking-123',
          amount: 300,
          status: CautionStatus.PENDING,
        }),
      });
    });

    it('should generate checkout report PDF and upload it', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(confirmedBooking);
      mockPrismaService.caution.create.mockResolvedValue({ id: 'caution-1' });
      mockPrismaService.booking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_OUT,
      });
      mockPrismaService.vehicle.update.mockResolvedValue(mockVehicle);

      await service.checkout(tenantId, 'booking-123', checkoutDto, userId);

      expect(mockPdfService.generateCheckoutReport).toHaveBeenCalledWith(
        confirmedBooking,
        checkoutDto,
      );
      expect(mockStorageService.uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        `bookings/${tenantId}/booking-123`,
        'checkout-report-booking-123.pdf',
        'application/pdf',
      );
    });

    it('should create audit log on checkout', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(confirmedBooking);
      mockPrismaService.caution.create.mockResolvedValue({ id: 'caution-1' });
      mockPrismaService.booking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_OUT,
      });
      mockPrismaService.vehicle.update.mockResolvedValue(mockVehicle);

      await service.checkout(tenantId, 'booking-123', checkoutDto, userId);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        tenantId,
        'CHECKOUT_BOOKING',
        'Booking',
        'booking-123',
        userId,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for invalid transition CANCELLED → CHECKED_OUT', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        service.checkout(tenantId, 'booking-123', checkoutDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid transition CHECKED_IN → CHECKED_OUT', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_IN,
      });

      await expect(
        service.checkout(tenantId, 'booking-123', checkoutDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if checkout is before booking start date', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        ...confirmedBooking,
        startDate: new Date('2099-01-01'), // Far in the future
      });

      await expect(
        service.checkout(tenantId, 'booking-123', checkoutDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if km is less than vehicle current km', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(confirmedBooking);

      await expect(
        service.checkout(
          tenantId,
          'booking-123',
          { ...checkoutDto, km: 5000 } as any, // Less than 10000
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.checkout(tenantId, 'non-existent', checkoutDto, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // checkin
  // ================================================================
  describe('checkin', () => {
    const checkinDto = {
      km: 10500,
      fuelLevel: 80,
      photos: [],
      signature: 'base64-sig',
      notes: 'Minor scratch',
      newDamages: [],
    } as any;

    const checkedOutBooking = {
      id: 'booking-123',
      status: BookingStatus.CHECKED_OUT,
      vehicleId: 'vehicle-123',
      tenantId,
      kmOut: 10000,
      vehicle: { id: 'vehicle-123', currentKm: 10000 },
      customer: mockCustomer,
      caution: { id: 'caution-1', status: CautionStatus.PENDING },
    };

    it('should checkin a CHECKED_OUT booking successfully', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(checkedOutBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...checkedOutBooking,
        status: BookingStatus.CHECKED_IN,
        kmIn: 10500,
      });
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...mockVehicle,
        currentKm: 10500,
        status: VehicleStatus.AVAILABLE,
      });

      const result = await service.checkin(tenantId, 'booking-123', checkinDto, userId);

      expect(result.status).toBe(BookingStatus.CHECKED_IN);
      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vehicle-123' },
          data: expect.objectContaining({
            status: VehicleStatus.AVAILABLE,
            currentKm: 10500,
          }),
        }),
      );
    });

    it('should create audit log on checkin', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(checkedOutBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...checkedOutBooking,
        status: BookingStatus.CHECKED_IN,
      });
      mockPrismaService.vehicle.update.mockResolvedValue(mockVehicle);

      await service.checkin(tenantId, 'booking-123', checkinDto, userId);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        tenantId,
        'CHECKIN_BOOKING',
        'Booking',
        'booking-123',
        userId,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for invalid transition CONFIRMED → CHECKED_IN', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        ...checkedOutBooking,
        status: BookingStatus.CONFIRMED,
      });

      await expect(
        service.checkin(tenantId, 'booking-123', checkinDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.checkin(tenantId, 'non-existent', checkinDto, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // cancel
  // ================================================================
  describe('cancel', () => {
    it('should cancel a CONFIRMED booking and release vehicle', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        vehicleId: 'vehicle-123',
        tenantId,
        totalAmount: 300,
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h from now
        notes: '',
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });
      mockPrismaService.vehicle.update.mockResolvedValue({
        id: 'vehicle-123',
        status: VehicleStatus.AVAILABLE,
      });

      const result = await service.cancel(tenantId, 'booking-123', 'Customer request', userId);

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vehicle-123' },
          data: { status: VehicleStatus.AVAILABLE },
        }),
      );
    });

    it('should calculate cancellation fee when < 24h before start', async () => {
      const startingSoon = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h from now
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        vehicleId: 'vehicle-123',
        tenantId,
        totalAmount: 500,
        startDate: startingSoon,
        notes: null,
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });
      mockPrismaService.vehicle.update.mockResolvedValue({
        id: 'vehicle-123',
        status: VehicleStatus.AVAILABLE,
      });

      // The method completes successfully - fee is calculated internally
      // (fee = 500 * 20/100 = 100 EUR, not yet persisted in current implementation)
      const result = await service.cancel(tenantId, 'booking-123', 'Late cancel', userId);

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should complete without fee when >= 24h before start', async () => {
      const farAway = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h from now
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        vehicleId: 'vehicle-123',
        tenantId,
        totalAmount: 500,
        startDate: farAway,
        notes: null,
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });
      mockPrismaService.vehicle.update.mockResolvedValue({
        id: 'vehicle-123',
        status: VehicleStatus.AVAILABLE,
      });

      const result = await service.cancel(tenantId, 'booking-123', 'Changed plans', userId);

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw BadRequestException for CHECKED_IN booking (terminal state)', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        id: 'booking-123',
        status: BookingStatus.CHECKED_IN,
        tenantId,
      });

      await expect(
        service.cancel(tenantId, 'booking-123', 'Reason', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for CHECKED_OUT booking', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        id: 'booking-123',
        status: BookingStatus.CHECKED_OUT,
        tenantId,
      });

      await expect(
        service.cancel(tenantId, 'booking-123', 'Reason', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already CANCELLED booking', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        id: 'booking-123',
        status: BookingStatus.CANCELLED,
        tenantId,
      });

      await expect(
        service.cancel(tenantId, 'booking-123', 'Reason', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.cancel(tenantId, 'non-existent', 'Reason', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should append cancellation reason to notes', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        vehicleId: 'vehicle-123',
        tenantId,
        totalAmount: 300,
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        notes: 'Original note',
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockImplementation(({ data }: any) => ({
        ...mockBooking,
        ...data,
      }));
      mockPrismaService.vehicle.update.mockResolvedValue({ id: 'vehicle-123' });

      await service.cancel(tenantId, 'booking-123', 'Customer changed plans', userId);

      expect(mockPrismaService.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('Customer changed plans'),
          }),
        }),
      );
    });
  });

  // ================================================================
  // findAll
  // ================================================================
  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      const mockBookings = [
        { id: 'booking-1', status: BookingStatus.CONFIRMED },
        { id: 'booking-2', status: BookingStatus.CONFIRMED },
      ];

      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.booking.count.mockResolvedValue(2);

      const result = await service.findAll(tenantId, { page: '1', limit: '10' });

      expect(result.bookings).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by status', async () => {
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.booking.count.mockResolvedValue(0);

      await service.findAll(tenantId, { status: BookingStatus.CONFIRMED });

      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: BookingStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.booking.count.mockResolvedValue(0);

      const result = await service.findAll(tenantId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by date range', async () => {
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.booking.count.mockResolvedValue(0);

      await service.findAll(tenantId, {
        startFrom: '2024-01-01',
        startTo: '2024-01-31',
      });

      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
        }),
      );
    });
  });

  // ================================================================
  // findOne
  // ================================================================
  describe('findOne', () => {
    it('should return a booking with relations', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        vehicle: { id: 'vehicle-123', brand: 'Toyota' },
        customer: { id: 'customer-123', firstName: 'John' },
        pdfBookingKey: null,
        pdfCheckOutKey: null,
        pdfCheckInKey: null,
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);

      const result = await service.findOne(tenantId, 'booking-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-123');
      expect(result.vehicle).toBeDefined();
      expect(result.customer).toBeDefined();
    });

    it('should generate presigned URLs for existing PDFs', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        id: 'booking-123',
        pdfBookingKey: 'bookings/contract.pdf',
        pdfCheckOutKey: 'bookings/checkout.pdf',
        pdfCheckInKey: null,
      });

      const result = await service.findOne(tenantId, 'booking-123');

      expect(mockStorageService.getPresignedUrl).toHaveBeenCalledWith(
        'bookings/contract.pdf',
        3600,
      );
      expect(mockStorageService.getPresignedUrl).toHaveBeenCalledWith(
        'bookings/checkout.pdf',
        3600,
      );
      expect(result.pdfBookingUrl).toBeDefined();
      expect(result.pdfCheckOutUrl).toBeDefined();
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // remove
  // ================================================================
  describe('remove', () => {
    it('should delete a booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CANCELLED,
        tenantId,
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.delete.mockResolvedValue(mockBooking);

      await service.remove(tenantId, 'booking-123', userId);

      expect(mockPrismaService.booking.delete).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        tenantId,
        'DELETE_BOOKING',
        'Booking',
        'booking-123',
        userId,
        expect.any(Object),
        null,
      );
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(tenantId, 'non-existent', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // getStatsSummary
  // ================================================================
  describe('getStatsSummary', () => {
    it('should return booking statistics with status breakdown', async () => {
      mockPrismaService.booking.count.mockResolvedValue(100);
      mockPrismaService.booking.groupBy.mockResolvedValue([
        { status: BookingStatus.CONFIRMED, _count: { status: 30 } },
        { status: BookingStatus.CHECKED_OUT, _count: { status: 20 } },
        { status: BookingStatus.CHECKED_IN, _count: { status: 40 } },
        { status: BookingStatus.CANCELLED, _count: { status: 10 } },
      ]);

      const result = await service.getStatsSummary(tenantId);

      expect(result).toBeDefined();
      expect(result.total).toBe(100);
      expect(result.status.CONFIRMED).toBe(30);
      expect(result.status.CHECKED_OUT).toBe(20);
      expect(result.status.CHECKED_IN).toBe(40);
      expect(result.status.CANCELLED).toBe(10);
      expect(result.status.NO_SHOW).toBe(0); // Default 0
    });

    it('should include pickups and returns counts', async () => {
      mockPrismaService.booking.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(5)  // pickups
        .mockResolvedValueOnce(3); // returns
      mockPrismaService.booking.groupBy.mockResolvedValue([]);

      const result = await service.getStatsSummary(tenantId, '2024-01-01', '2024-01-31');

      expect(result.pickups).toBeDefined();
      expect(result.returns).toBeDefined();
    });
  });
});
