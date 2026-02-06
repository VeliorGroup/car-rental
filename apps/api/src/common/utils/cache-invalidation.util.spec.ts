import { Test, TestingModule } from '@nestjs/testing';
import { CacheInvalidationService } from './cache-invalidation.util';
import { RedisCacheService } from '../services/redis-cache.service';

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;
  let cacheService: RedisCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInvalidationService,
        {
          provide: RedisCacheService,
          useValue: {
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheInvalidationService>(CacheInvalidationService);
    cacheService = module.get<RedisCacheService>(RedisCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('invalidateTenant', () => {
    it('should invalidate all cache entries for a tenant', async () => {
      await service.invalidateTenant('tenant-123');

      expect(cacheService.deletePattern).toHaveBeenCalledTimes(5);
      expect(cacheService.deletePattern).toHaveBeenCalledWith('user:tenant-123:*');
      expect(cacheService.deletePattern).toHaveBeenCalledWith('vehicle:tenant-123:*');
      expect(cacheService.deletePattern).toHaveBeenCalledWith('booking:tenant-123:*');
      expect(cacheService.deletePattern).toHaveBeenCalledWith('analytics:tenant-123:*');
      expect(cacheService.deletePattern).toHaveBeenCalledWith('pricing:tenant-123:*');
    });
  });

  describe('invalidateUser', () => {
    it('should invalidate specific user cache', async () => {
      await service.invalidateUser('tenant-123', 'user-456');

      expect(cacheService.delete).toHaveBeenCalledWith('user:tenant-123:user-456');
    });
  });

  describe('invalidateVehicle', () => {
    it('should invalidate specific vehicle cache', async () => {
      await service.invalidateVehicle('tenant-123', 'vehicle-456');

      expect(cacheService.delete).toHaveBeenCalledWith('vehicle:tenant-123:vehicle-456');
    });

    it('should invalidate all vehicle cache if no ID provided', async () => {
      await service.invalidateVehicle('tenant-123');

      expect(cacheService.deletePattern).toHaveBeenCalledWith('vehicle:tenant-123:*');
    });
  });

  describe('invalidateBooking', () => {
    it('should invalidate specific booking cache', async () => {
      await service.invalidateBooking('tenant-123', 'booking-456');

      expect(cacheService.delete).toHaveBeenCalledWith('booking:tenant-123:booking-456');
    });

    it('should invalidate all booking cache if no ID provided', async () => {
      await service.invalidateBooking('tenant-123');

      expect(cacheService.deletePattern).toHaveBeenCalledWith('booking:tenant-123:*');
    });
  });

  describe('invalidateAnalytics', () => {
    it('should invalidate analytics cache', async () => {
      await service.invalidateAnalytics('tenant-123');

      expect(cacheService.deletePattern).toHaveBeenCalledWith('analytics:tenant-123:*');
    });
  });

  describe('invalidatePricing', () => {
    it('should invalidate pricing cache', async () => {
      await service.invalidatePricing('tenant-123');

      expect(cacheService.deletePattern).toHaveBeenCalledWith('pricing:tenant-123:*');
    });
  });
});
