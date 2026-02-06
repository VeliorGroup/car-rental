import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';

export const SKIP_SUBSCRIPTION_CHECK = 'skipSubscriptionCheck';

@Injectable()
export class SubscriptionRequiredGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked to skip subscription check
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user or no tenantId, let other guards handle it
    if (!user || !user.tenantId) {
      return true;
    }

    // Allow impersonated sessions (superadmin logged in as tenant)
    if (user.impersonated) {
      return true;
    }

    // Check tenant and subscription status
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        subscription: true,
      },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    // Check if tenant is active
    if (!tenant.isActive) {
      throw new ForbiddenException('TENANT_INACTIVE', 'Your account has been deactivated. Please contact support.');
    }

    // Check subscription status
    const subscription = tenant.subscription;
    
    if (!subscription) {
      throw new ForbiddenException('NO_SUBSCRIPTION', 'No active subscription found. Please subscribe to continue.');
    }

    const validStatuses = ['ACTIVE', 'TRIAL'];
    if (!validStatuses.includes(subscription.status)) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED', `Your subscription is ${subscription.status.toLowerCase()}. Please renew to continue.`);
    }

    // Check if trial/subscription has expired
    if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date()) {
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED', 'Your subscription has expired. Please renew to continue.');
    }

    return true;
  }
}
