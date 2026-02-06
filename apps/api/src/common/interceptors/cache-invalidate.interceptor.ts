import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_INVALIDATE_KEY, CacheInvalidateOptions } from '../decorators/cache-invalidate.decorator';
import { CacheInvalidationService } from '../utils/cache-invalidation.util';

/**
 * Interceptor to automatically invalidate cache after method execution
 * Works with @CacheInvalidate decorator
 */
@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheInvalidation: CacheInvalidationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.getAllAndOverride<CacheInvalidateOptions>(
      CACHE_INVALIDATE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId || request.user?.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const entityId = options.idParam
            ? request.params[options.idParam] || request.body[options.idParam]
            : undefined;

          switch (options.entity) {
            case 'user':
              if (entityId) {
                await this.cacheInvalidation.invalidateUser(tenantId, entityId);
              }
              break;
            case 'vehicle':
              await this.cacheInvalidation.invalidateVehicle(tenantId, entityId);
              break;
            case 'booking':
              await this.cacheInvalidation.invalidateBooking(tenantId, entityId);
              break;
            case 'analytics':
              await this.cacheInvalidation.invalidateAnalytics(tenantId);
              break;
            case 'pricing':
              await this.cacheInvalidation.invalidatePricing(tenantId);
              break;
            case 'tenant':
              await this.cacheInvalidation.invalidateTenant(tenantId);
              break;
          }
        } catch (error) {
          // Don't fail the request if cache invalidation fails
          new Logger('CacheInvalidateInterceptor').error('Cache invalidation failed:', error);
        }
      }),
    );
  }
}
