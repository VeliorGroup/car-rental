import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottleCustomGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip || req.headers?.['x-forwarded-for'] || 'unknown';
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for health checks
    const request = context.switchToHttp().getRequest();
    if (request.url?.includes('/health')) {
      return true;
    }
    return false;
  }
}
