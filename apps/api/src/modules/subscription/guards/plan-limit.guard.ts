import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<string>('planResource', context.getHandler());
    if (!resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      return false;
    }

    const hasAccess = await this.subscriptionService.checkLimit(
      user.tenantId,
      resource as 'maxVehicles' | 'maxUsers' | 'maxLocations',
    );

    if (!hasAccess) {
      throw new ForbiddenException(`Plan limit reached for ${resource}. Please upgrade your subscription.`);
    }

    return true;
  }
}
