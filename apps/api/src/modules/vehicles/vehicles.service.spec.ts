import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { MetricsService } from '../../common/services/metrics.service';
import { AuditService } from '../../common/services/audit.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { QueueService } from '../../common/queue/queue.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prismaService: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockVehicle = {
    id: 'vehicle-123',
    tenantId: mockTenantId,
    brand: 'Toyota',
    model: 'Corolla',
    year: 2023,
    licensePlate: 'AA123BB',
    category: 'COMPACT',
    status: 'AVAILABLE',
    fuelType: 'GASOLINE',
    transmission: 'AUTOMATIC',
    seatCount: 5,
    currentKm: 10000,
    photos: [],
    tires: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    vehicle: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
    createWithTenant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StorageService,
          useValue: {
            uploadResizedImage: jest.fn().mockResolvedValue('photo-key'),
            getSignedUrl: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
            getPresignedUrls: jest.fn().mockResolvedValue(['https://example.com/photo.jpg']),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            recordEvent: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addJob: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated vehicles', async () => {
      const mockVehicles = [mockVehicle];
      mockPrismaService.vehicle.findMany.mockResolvedValue(mockVehicles);
      mockPrismaService.vehicle.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {
        page: '1',
        limit: '20',
      });

      expect(result.vehicles).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
      mockPrismaService.vehicle.count.mockResolvedValue(1);

      await service.findAll(mockTenantId, {
        status: 'AVAILABLE',
      });

      expect(mockPrismaService.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: 'AVAILABLE',
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
      mockPrismaService.vehicle.count.mockResolvedValue(1);

      await service.findAll(mockTenantId, {
        category: 'COMPACT',
      });

      expect(mockPrismaService.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            category: 'COMPACT',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a vehicle if found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.findOne(mockTenantId, 'vehicle-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('vehicle-123');
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2023,
      licensePlate: 'AA123BB',
      category: 'COMPACT' as const,
      fuelType: 'GASOLINE' as const,
      transmission: 'AUTOMATIC' as const,
      seatCount: 5,
      currentKm: 10000,
      purchaseDate: '2023-01-01',
      insuranceExpiry: '2024-12-31',
      reviewDate: '2024-06-01',
    };

    it('should create a vehicle successfully', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);
      mockPrismaService.createWithTenant.mockResolvedValue(mockVehicle);

      const result = await service.create(mockTenantId, createDto, mockUserId);

      expect(result).toBeDefined();
      expect(mockPrismaService.createWithTenant).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if license plate exists', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await expect(
        service.create(mockTenantId, createDto, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a vehicle successfully', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...mockVehicle,
        currentKm: 15000,
      });

      const result = await service.update(
        mockTenantId,
        'vehicle-123',
        { currentKm: 15000 },
        mockUserId,
      );

      expect(result.currentKm).toBe(15000);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'non-existent', {}, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a vehicle successfully', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.vehicle.delete.mockResolvedValue(mockVehicle);

      const result = await service.remove(mockTenantId, 'vehicle-123', mockUserId);
      
      expect(result).toBeUndefined();
      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vehicle-123' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockTenantId, 'non-existent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
