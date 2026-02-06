import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { RedisCacheService } from '../../common/services/redis-cache.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private cacheService: RedisCacheService,
  ) {}

  async findAllPlans(countryCode?: string) {
    const cacheKey = `subscription:plans:${countryCode || 'default'}`;
    
    return this.cacheService.getOrCompute(cacheKey, async () => {
      const plans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        include: {
          pricing: true,
          planFeatures: {
            include: {
              feature: true
            },
            orderBy: {
              feature: { sortOrder: 'asc' }
            }
          }
        },
        orderBy: { sortOrder: 'asc' },
      });

      return plans.map(plan => {
        let price = plan.price;
        let yearlyPrice = plan.yearlyPrice;
        let currency = plan.currency;

        if (countryCode && plan.pricing && plan.pricing.length > 0) {
          const localPricing = plan.pricing.find(p => p.country === countryCode);
          if (localPricing) {
            price = localPricing.price;
            yearlyPrice = localPricing.yearlyPrice;
            currency = localPricing.currency;
          }
        }

        // Extract features from planFeatures relation
        const features = plan.planFeatures.map(pf => ({
          id: pf.feature.id,
          name: pf.feature.name,
          displayName: pf.feature.displayName,
          description: pf.feature.description,
          icon: pf.feature.icon
        }));

        // Remove pricing and planFeatures arrays from output
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pricing, planFeatures, ...rest } = plan;
        
        return {
          ...rest,
          price,
          yearlyPrice,
          currency,
          features
        };
      });
    }, 600); // 10 minutes cache
  }

  async getTenantCountry(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { country: true }
    });
    return tenant?.country;
  }

  async findOne(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      // Return null or throw? For public API maybe throw, for internal checks return null
      return null;
    }

    return subscription;
  }

  async create(dto: CreateSubscriptionDto) {
    // Calculate trial end (14 days)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    return this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        planId: dto.planId,
        status: dto.status || 'TRIAL',
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
        trialEndsAt: trialEndsAt,
      },
    });
  }

  async processPaymentSuccess(tenantId: string) {
    // 1. Update subscription status
    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (subscription && subscription.status !== 'ACTIVE') {
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { status: 'ACTIVE' }
      });
      
      // 2. Check for referral reward
      await this.checkReferralReward(tenantId);
    }
  }

  private async checkReferralReward(tenantId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { referredId: tenantId },
      include: { referrer: { include: { subscription: true } } }
    });

    if (referral && referral.status === 'PENDING') {
      // Mark as qualified
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'QUALIFIED' }
      });

      // Count qualified referrals for referrer
      const count = await this.prisma.referral.count({
        where: { 
          referrerId: referral.referrerId,
          status: 'QUALIFIED'
        }
      });

      // Every 5th referral grants 1 year free
      if (count % 5 === 0) {
        const referrerSub = referral.referrer.subscription;
        if (referrerSub) {
          const currentEnd = new Date(referrerSub.currentPeriodEnd);
          const newEnd = new Date(currentEnd);
          newEnd.setFullYear(newEnd.getFullYear() + 1);
          
          await this.prisma.subscription.update({
            where: { id: referrerSub.id },
            data: { currentPeriodEnd: newEnd }
          });
          
          // Ideally notify referrer
        }
      }
    }
  }

  async checkLimit(tenantId: string, resource: 'maxVehicles' | 'maxUsers' | 'maxLocations'): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    // If no subscription, assume no access or default strict limits
    if (!subscription) return false;

    let currentCount = 0;
    
    if (resource === 'maxVehicles') {
      currentCount = await this.prisma.vehicle.count({ where: { tenantId } });
    } else if (resource === 'maxUsers') {
      currentCount = await this.prisma.user.count({ where: { tenantId } });
    }
    // Add location check logic here when locations are implemented

    return currentCount < subscription.plan[resource];
  }
}
