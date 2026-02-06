import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { AuditService } from '../../common/services/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomerCategory, CustomerStatus } from '@prisma/client';

describe('CustomersService', () => {
  let service: CustomersService;

  const mockPrismaService: any = {
    customer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    createWithTenant: jest.fn(),
  };

  const mockStorageService = {
    uploadResizedImage: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockCustomer = {
    id: 'customer-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+355123456789',
    licenseNumber: 'AL12345',
    licenseExpiry: new Date('2025-12-31'),
    dateOfBirth: new Date('1990-01-01'),
    city: 'Tirana',
    country: 'AL',
    status: CustomerStatus.ACTIVE,
    category: CustomerCategory.STANDARD,
    discountPercentage: 0,
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const createDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+355123456789',
      licenseNumber: 'AL12345',
      licenseExpiry: '2025-12-31',
      dateOfBirth: '1990-01-01',
      city: 'Tirana',
      country: 'AL',
    };

    it('should create a customer successfully', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      mockPrismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create(tenantId, createDto as any, {}, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe('customer-123');
      expect(mockPrismaService.customer.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        tenantId,
        'CREATE_CUSTOMER',
        'Customer',
        'customer-123',
        userId,
        null,
        expect.any(Object),
      );
    });

    it('should throw BadRequestException if customer already exists', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);

      await expect(
        service.create(tenantId, createDto as any, {}, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload license documents when provided', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      mockPrismaService.customer.create.mockResolvedValue(mockCustomer);
      mockStorageService.uploadResizedImage.mockResolvedValue('uploaded-key');

      const files = {
        licenseFront: { buffer: Buffer.from('test'), mimetype: 'image/jpeg' },
        licenseBack: { buffer: Buffer.from('test'), mimetype: 'image/jpeg' },
      };

      await service.create(tenantId, createDto as any, files, userId);

      expect(mockStorageService.uploadResizedImage).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    const tenantId = 'tenant-123';

    it('should return paginated customers', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([mockCustomer]);
      mockPrismaService.customer.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, { page: '1', limit: '10' });

      expect(result.customers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by status', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.customer.count.mockResolvedValue(0);

      await service.findAll(tenantId, { status: CustomerStatus.ACTIVE });

      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: CustomerStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.customer.count.mockResolvedValue(0);

      await service.findAll(tenantId, { category: CustomerCategory.PREMIUM });

      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            category: CustomerCategory.PREMIUM,
          }),
        }),
      );
    });

    it('should search by name, email, or phone', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.customer.count.mockResolvedValue(0);

      await service.findAll(tenantId, { search: 'john' });

      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const tenantId = 'tenant-123';

    it('should return a customer with recent bookings', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        bookings: [],
      });

      const result = await service.findOne(tenantId, 'customer-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('customer-123');
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';

    it('should update customer successfully', async () => {
      const updateDto = { firstName: 'Jane' };
      const updatedCustomer = { ...mockCustomer, firstName: 'Jane' };

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.customer.update.mockResolvedValue(updatedCustomer);

      const result = await service.update(tenantId, 'customer-123', updateDto as any, {}, userId);

      expect(result.firstName).toBe('Jane');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        tenantId,
        'UPDATE_CUSTOMER',
        'Customer',
        'customer-123',
        userId,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'non-existent', {}, {}, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to deactivate customer with active bookings', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count.mockResolvedValue(2);

      await expect(
        service.update(tenantId, 'customer-123', { status: CustomerStatus.SUSPENDED } as any, {}, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate discount when category changes', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.customer.update.mockResolvedValue({
        ...mockCustomer,
        category: CustomerCategory.PREMIUM,
        discountPercentage: 15,
      });

      const result = await service.update(
        tenantId,
        'customer-123',
        { category: CustomerCategory.PREMIUM } as any,
        {},
        userId,
      );

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountPercentage: 15,
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';

    it('should delete customer without active bookings', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count
        .mockResolvedValueOnce(0) // Active bookings
        .mockResolvedValueOnce(0); // Future bookings
      mockPrismaService.customer.delete.mockResolvedValue(mockCustomer);

      await service.remove(tenantId, 'customer-123', userId);

      expect(mockPrismaService.customer.delete).toHaveBeenCalledWith({
        where: { id: 'customer-123' },
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if customer has active bookings', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count.mockResolvedValue(1);

      await expect(
        service.remove(tenantId, 'customer-123', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if customer has future bookings', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count
        .mockResolvedValueOnce(0) // Active bookings
        .mockResolvedValueOnce(2); // Future bookings

      await expect(
        service.remove(tenantId, 'customer-123', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete customer documents from storage', async () => {
      const customerWithDocs = {
        ...mockCustomer,
        licenseFrontKey: 'license-front-key',
        licenseBackKey: 'license-back-key',
        idCardFrontKey: 'id-front-key',
        idCardBackKey: 'id-back-key',
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(customerWithDocs);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.customer.delete.mockResolvedValue(customerWithDocs);

      await service.remove(tenantId, 'customer-123', userId);

      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCustomerBookings', () => {
    const tenantId = 'tenant-123';

    it('should return customer booking history', async () => {
      const mockBookings = [
        { id: 'booking-1', status: 'COMPLETED' },
        { id: 'booking-2', status: 'CONFIRMED' },
      ];

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.getCustomerBookings(tenantId, 'customer-123');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-123', tenantId },
        orderBy: { createdAt: 'desc' },
        include: { vehicle: true },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.getCustomerBookings(tenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatsSummary', () => {
    const tenantId = 'tenant-123';

    it('should return customer statistics', async () => {
      mockPrismaService.customer.count.mockResolvedValue(100);
      mockPrismaService.customer.groupBy.mockResolvedValue([
        { status: CustomerStatus.ACTIVE, _count: { status: 90 } },
        { status: CustomerStatus.SUSPENDED, _count: { status: 10 } },
      ]);

      const result = await service.getStatsSummary(tenantId);

      expect(result).toBeDefined();
      expect(result.total).toBe(100);
      expect(result.status).toBeDefined();
    });

    it('should filter by search term', async () => {
      mockPrismaService.customer.count.mockResolvedValue(5);
      mockPrismaService.customer.groupBy.mockResolvedValue([]);

      await service.getStatsSummary(tenantId, 'john');

      expect(mockPrismaService.customer.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId,
          OR: expect.any(Array),
        }),
      });
    });
  });

  describe('calculateDiscount (private method via update)', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';

    it('should assign 15% discount for PREMIUM category', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.customer.update.mockImplementation(async ({ data }: any) => ({
        ...mockCustomer,
        ...data,
      }));

      await service.update(
        tenantId,
        'customer-123',
        { category: CustomerCategory.PREMIUM } as any,
        {},
        userId,
      );

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountPercentage: 15,
          }),
        }),
      );
    });

    it('should assign 10% discount for BUSINESS category', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.customer.update.mockImplementation(async ({ data }: any) => ({
        ...mockCustomer,
        ...data,
      }));

      await service.update(
        tenantId,
        'customer-123',
        { category: CustomerCategory.BUSINESS } as any,
        {},
        userId,
      );

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountPercentage: 10,
          }),
        }),
      );
    });

    it('should assign 0% discount for STANDARD category', async () => {
      const premiumCustomer = { ...mockCustomer, category: CustomerCategory.PREMIUM, discountPercentage: 15 };
      mockPrismaService.customer.findFirst.mockResolvedValue(premiumCustomer);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.customer.update.mockImplementation(async ({ data }: any) => ({
        ...premiumCustomer,
        ...data,
      }));

      await service.update(
        tenantId,
        'customer-123',
        { category: CustomerCategory.STANDARD } as any,
        {},
        userId,
      );

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountPercentage: 0,
          }),
        }),
      );
    });
  });
});
