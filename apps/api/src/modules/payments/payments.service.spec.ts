import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PayseraService } from '../../common/services/paysera.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentStatus, PaymentType, BookingStatus } from '@prisma/client';
import { createHmac } from 'crypto';

// ── Helpers ────────────────────────────────────────────────────────
const SIGN_PASSWORD = 'test_sign_password';

function encodePayseraData(params: string): string {
  return Buffer.from(params).toString('base64');
}

function computeSs1(base64Data: string): string {
  return createHmac('md5', SIGN_PASSWORD).update(base64Data).digest('hex');
}

describe('PaymentsService', () => {
  let service: PaymentsService;

  // ── Prisma mock ────────────────────────────────────────────────
  const mockPrismaService: any = {
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (prisma: any) => any) =>
      callback(mockPrismaService),
    ),
  };

  // ── Dependency mocks ───────────────────────────────────────────
  const mockPayseraService = {
    createOrder: jest.fn(),
    getOrderStatus: jest.fn(),
    verifyWebhookSignature: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        API_URL: 'https://api.example.com',
        FRONTEND_URL: 'https://app.example.com',
        PAYSERA_SIGN_PASSWORD: SIGN_PASSWORD,
      };
      return config[key] ?? defaultValue;
    }),
  };

  // ── Shared fixtures ────────────────────────────────────────────
  const tenantId = 'tenant-123';
  const userId = 'user-123';

  const mockBooking = {
    id: 'booking-123',
    tenantId,
    customer: {
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const mockPayment = {
    id: 'payment-123',
    bookingId: 'booking-123',
    transactionId: 'ORD-123456-booking',
    amount: 100.0,
    status: PaymentStatus.PENDING,
    type: PaymentType.DEPOSIT,
    tenantId,
  };

  // ── Test module setup ──────────────────────────────────────────
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PayseraService, useValue: mockPayseraService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ================================================================
  // initiatePayment
  // ================================================================
  describe('initiatePayment', () => {
    const createDto = {
      bookingId: 'booking-123',
      amount: 100.0,
      type: PaymentType.DEPOSIT,
      description: 'Deposit for booking',
    };

    it('should initiate payment successfully', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.payment.findFirst.mockResolvedValue(null); // No existing payment
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPayseraService.createOrder.mockResolvedValue({
        url: 'https://paysera.com/pay/order-123',
      });

      const result = await service.initiatePayment(tenantId, createDto, userId);

      expect(result).toBeDefined();
      expect(result.paymentUrl).toBe('https://paysera.com/pay/order-123');
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toMatch(/^ORD-\d+-booking-/);
    });

    it('should create payment record with correct data', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPayseraService.createOrder.mockResolvedValue({ url: 'https://paysera.com/pay' });

      await service.initiatePayment(tenantId, createDto, userId);

      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          bookingId: 'booking-123',
          amount: 100.0,
          currency: 'EUR',
          status: PaymentStatus.PENDING,
          provider: 'PAYSERA',
          type: PaymentType.DEPOSIT,
          createdById: userId,
        }),
      });
    });

    it('should pass correct URLs to Paysera', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPayseraService.createOrder.mockResolvedValue({ url: 'https://paysera.com/pay' });

      await service.initiatePayment(tenantId, createDto, userId);

      expect(mockPayseraService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          callback_url: 'https://api.example.com/api/v1/payments/callback',
          return_url: expect.stringContaining('/payment/success'),
          email: 'customer@example.com',
        }),
      );
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.initiatePayment(tenantId, createDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if successful payment already exists (double payment prevention)', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'existing-payment',
        status: PaymentStatus.SUCCEEDED,
        type: PaymentType.DEPOSIT,
      });

      await expect(
        service.initiatePayment(tenantId, createDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use fallback email if customer email is missing', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPayseraService.createOrder.mockResolvedValue({ url: 'https://paysera.com/pay' });

      await service.initiatePayment(tenantId, createDto, userId);

      expect(mockPayseraService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'noreply@carrental.com',
        }),
      );
    });

    it('should generate unique order ID with timestamp', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPayseraService.createOrder.mockResolvedValue({ url: 'https://paysera.com/pay' });

      const result = await service.initiatePayment(tenantId, createDto, userId);

      // Format: ORD-{timestamp}-{bookingId_first8}
      expect(result.orderId).toMatch(/^ORD-\d+-booking-/);
    });
  });

  // ================================================================
  // handleCallback
  // ================================================================
  describe('handleCallback', () => {
    function buildCallbackQuery(
      params: string,
      validSignature = true,
    ): { data: string; ss1: string; ss2: string } {
      const encodedData = encodePayseraData(params);
      return {
        data: encodedData,
        ss1: validSignature ? computeSs1(encodedData) : 'invalid_signature',
        ss2: 'unused',
      };
    }

    it('should process successful payment callback', async () => {
      const query = buildCallbackQuery('orderid=ORD-123&status=1&amount=10000');

      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        transactionId: 'ORD-123',
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      });
      mockPrismaService.booking.update.mockResolvedValue({
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.handleCallback(query);

      expect(result).toBe('OK');
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        data: { status: PaymentStatus.SUCCEEDED },
      });
    });

    it('should update booking status for DEPOSIT payments', async () => {
      const query = buildCallbackQuery('orderid=ORD-123&status=1&amount=10000');

      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        transactionId: 'ORD-123',
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      });
      mockPrismaService.booking.update.mockResolvedValue({});

      await service.handleCallback(query);

      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        data: { status: BookingStatus.CONFIRMED },
      });
    });

    it('should update booking status for FULL_PAYMENT payments', async () => {
      const query = buildCallbackQuery('orderid=ORD-123&status=1&amount=10000');

      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        transactionId: 'ORD-123',
        type: PaymentType.FULL_PAYMENT,
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.booking.update.mockResolvedValue({});

      await service.handleCallback(query);

      expect(mockPrismaService.booking.update).toHaveBeenCalled();
    });

    it('should be idempotent — not update already succeeded payment', async () => {
      const query = buildCallbackQuery('orderid=ORD-123&status=1&amount=10000');

      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        transactionId: 'ORD-123',
        status: PaymentStatus.SUCCEEDED,
      });

      const result = await service.handleCallback(query);

      expect(result).toBe('OK');
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
      expect(mockPrismaService.booking.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid signature', async () => {
      const query = buildCallbackQuery(
        'orderid=ORD-123&status=1&amount=10000',
        false, // invalid signature
      );

      await expect(service.handleCallback(query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for amount mismatch', async () => {
      // Payment amount is 100.00, so expected callback amount = 10000 cents
      // We send 5000 cents (50.00 EUR) → mismatch
      const query = buildCallbackQuery('orderid=ORD-123&status=1&amount=5000');

      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        transactionId: 'ORD-123',
        amount: 100.0,
        status: PaymentStatus.PENDING,
      });

      await expect(service.handleCallback(query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if orderid is missing', async () => {
      const query = buildCallbackQuery('status=1&amount=10000');

      await expect(service.handleCallback(query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if payment not found', async () => {
      const query = buildCallbackQuery('orderid=ORD-UNKNOWN&status=1&amount=10000');

      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      await expect(service.handleCallback(query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle non-success status (status != 1) gracefully', async () => {
      const query = buildCallbackQuery('orderid=ORD-123&status=0&amount=10000');

      const result = await service.handleCallback(query);

      expect(result).toBe('OK');
      expect(mockPrismaService.payment.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('should use $transaction for atomicity when updating payment', async () => {
      const query = buildCallbackQuery('orderid=ORD-123&status=1&amount=10000');

      mockPrismaService.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        transactionId: 'ORD-123',
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.booking.update.mockResolvedValue({});

      await service.handleCallback(query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  // ================================================================
  // handleSuccess
  // ================================================================
  describe('handleSuccess', () => {
    it('should return success status and verify with Paysera', async () => {
      mockPayseraService.getOrderStatus.mockResolvedValue({ status: 'paid' });

      const result = await service.handleSuccess('ORD-123');

      expect(result).toEqual({ status: 'success', orderId: 'ORD-123' });
      expect(mockPayseraService.getOrderStatus).toHaveBeenCalledWith('ORD-123');
    });
  });

  // ================================================================
  // handleCancel
  // ================================================================
  describe('handleCancel', () => {
    it('should mark payment as failed', async () => {
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.handleCancel('ORD-123');

      expect(result).toEqual({ status: 'cancelled', orderId: 'ORD-123' });
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith({
        where: { transactionId: 'ORD-123' },
        data: { status: PaymentStatus.FAILED },
      });
    });

    it('should handle case when no payment found', async () => {
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.handleCancel('ORD-NONEXISTENT');

      expect(result).toEqual({ status: 'cancelled', orderId: 'ORD-NONEXISTENT' });
    });
  });
});
