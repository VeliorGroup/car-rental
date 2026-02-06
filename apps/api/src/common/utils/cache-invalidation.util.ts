import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../services/redis-cache.service';
import { CACHE_KEYS, getCacheKey } from '../constants/app.constants';

/**
 * Service for cache invalidation with tenant namespace support
 */
@Injectable()
export class CacheInvalidationService {
  constructor(private cacheService: RedisCacheService) {}

  /**
   * Invalidate all cache entries for a specific tenant
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.USER}:${tenantId}:*`,
      `${CACHE_KEYS.VEHICLE}:${tenantId}:*`,
      `${CACHE_KEYS.BOOKING}:${tenantId}:*`,
      `${CACHE_KEYS.ANALYTICS}:${tenantId}:*`,
      `${CACHE_KEYS.PRICING}:${tenantId}:*`,
    ];

    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern);
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(tenantId: string, userId: string): Promise<void> {
    const key = getCacheKey(CACHE_KEYS.USER, tenantId, userId);
    await this.cacheService.delete(key);
  }

  /**
   * Invalidate vehicle cache
   */
  async invalidateVehicle(tenantId: string, vehicleId?: string): Promise<void> {
    if (vehicleId) {
      const key = getCacheKey(CACHE_KEYS.VEHICLE, tenantId, vehicleId);
      await this.cacheService.delete(key);
    } else {
      const pattern = `${CACHE_KEYS.VEHICLE}:${tenantId}:*`;
      await this.cacheService.deletePattern(pattern);
    }
  }

  /**
   * Invalidate booking cache
   */
  async invalidateBooking(tenantId: string, bookingId?: string): Promise<void> {
    if (bookingId) {
      const key = getCacheKey(CACHE_KEYS.BOOKING, tenantId, bookingId);
      await this.cacheService.delete(key);
    } else {
      const pattern = `${CACHE_KEYS.BOOKING}:${tenantId}:*`;
      await this.cacheService.deletePattern(pattern);
    }
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateAnalytics(tenantId: string): Promise<void> {
    const pattern = `${CACHE_KEYS.ANALYTICS}:${tenantId}:*`;
    await this.cacheService.deletePattern(pattern);
  }

  /**
   * Invalidate pricing cache
   */
  async invalidatePricing(tenantId: string): Promise<void> {
    const pattern = `${CACHE_KEYS.PRICING}:${tenantId}:*`;
    await this.cacheService.deletePattern(pattern);
  }
}
