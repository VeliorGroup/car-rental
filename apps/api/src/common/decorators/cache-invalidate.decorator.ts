import { SetMetadata } from '@nestjs/common';

export const CACHE_INVALIDATE_KEY = 'cache:invalidate';

export interface CacheInvalidateOptions {
  entity: 'user' | 'vehicle' | 'booking' | 'analytics' | 'pricing' | 'tenant';
  idParam?: string; // Parameter name for entity ID (e.g., 'id', 'vehicleId')
}

/**
 * Decorator to mark methods that should invalidate cache after execution
 * Usage: @CacheInvalidate({ entity: 'vehicle', idParam: 'id' })
 */
export const CacheInvalidate = (options: CacheInvalidateOptions) =>
  SetMetadata(CACHE_INVALIDATE_KEY, options);
