import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateTenantStatusDto } from './dto/admin.dto';
import { RedisCacheService } from '../../common/services/redis-cache.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cacheService: RedisCacheService,
  ) {}

  // Cleanup old activity logs every day at 3 AM (90 days retention)
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldActivityLogs() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const result = await this.prisma.userActivityLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });
    
    if (result.count > 0) {
      this.logger.log(`[ActivityLog Cleanup] Deleted ${result.count} logs older than 90 days`);
    }
  }

  // Cleanup old audit logs every day at 4 AM (1 year retention)
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldAuditLogs() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: oneYearAgo } },
    });
    
    if (result.count > 0) {
      this.logger.log(`[AuditLog Cleanup] Deleted ${result.count} logs older than 1 year`);
    }
  }

  // ============ AUTH ============
  async login(email: string, password: string) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { email } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.superAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.jwtService.sign({ 
      sub: admin.id, 
      email: admin.email,
      type: 'superadmin' 
    });

    return {
      access_token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  // ============ SUBSCRIPTION PLANS ============
  async getSubscriptionPlans() {
    return this.cacheService.getOrCompute(
      'admin:subscription_plans',
      async () => {
        return this.prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          orderBy: { price: 'asc' },
          select: {
            id: true,
            name: true,
            displayName: true,
            price: true,
            maxVehicles: true,
            maxUsers: true,
            maxLocations: true,
            planFeatures: {
              include: { feature: true },
            },
          },
        });
      },
      600 // 10 minutes cache
    );
  }

  async validateAdmin(id: string) {
    return this.prisma.superAdmin.findUnique({ 
      where: { id, isActive: true } 
    });
  }

  // ============ STATS ============
  // ============ STATS ============
  async getGlobalStats() {
    return this.cacheService.getOrCompute(
      'admin:global_stats',
      async () => {
        const [
          totalTenants,
          activeTenants,
          trialTenants,
          totalReferrals,
          qualifiedReferrals,
        ] = await Promise.all([
          this.prisma.tenant.count(),
          this.prisma.tenant.count({ where: { isActive: true } }),
          this.prisma.subscription.count({ where: { status: 'TRIAL' } }),
          this.prisma.referral.count(),
          this.prisma.referral.count({ where: { status: 'QUALIFIED' } }),
        ]);

        // Monthly recurring revenue calculation
        const activeSubscriptions = await this.prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          include: { plan: true },
        });
        const mrr = activeSubscriptions.reduce((sum, sub) => {
          return sum + Number(sub.plan.price);
        }, 0);

        // New tenants this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const newTenantsThisMonth = await this.prisma.tenant.count({
          where: { createdAt: { gte: startOfMonth } },
        });

        return {
          totalTenants,
          activeTenants,
          trialTenants,
          mrr,
          newTenantsThisMonth,
          totalReferrals,
          qualifiedReferrals,
        };
      },
      300 // 5 minutes TTL
    );
  }

  // ============ REVENUE ANALYTICS ============
  async getRevenueAnalytics() {
    return this.cacheService.getOrCompute(
      'admin:revenue_analytics',
      async () => {
        // Get all completed payments for total revenue grouped by currency
        const completedPayments = await this.prisma.tenantSubscriptionPayment.findMany({
          where: { status: 'SUCCEEDED' },
        });
        
        // Group revenue by currency
        const revenueByCurrency: Record<string, number> = {};
        for (const payment of completedPayments) {
          const currency = payment.currency || 'EUR';
          if (!revenueByCurrency[currency]) {
            revenueByCurrency[currency] = 0;
          }
          revenueByCurrency[currency] += Number(payment.amount);
        }

        // Get active subscriptions with plan info and tenant for currency
        const activeSubscriptions = await this.prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          include: { 
            plan: true,
            tenant: { select: { country: true } }
          },
        });

        // Map country to currency (simplified)
        const countryCurrencyMap: Record<string, string> = {
          'AL': 'ALL',
          'XK': 'EUR',
          'IT': 'EUR',
          'DE': 'EUR',
          'FR': 'EUR',
          'ES': 'EUR',
          'US': 'USD',
          'GB': 'GBP',
          'CH': 'CHF',
        };

        // Calculate MRR by currency
        const mrrByCurrency: Record<string, number> = {};
        for (const sub of activeSubscriptions) {
          const currency = countryCurrencyMap[sub.tenant?.country || ''] || 'EUR';
          if (!mrrByCurrency[currency]) {
            mrrByCurrency[currency] = 0;
          }
          mrrByCurrency[currency] += Number(sub.plan.price);
        }

        // Legacy single values (for backwards compatibility, use EUR or first currency)
        const totalRevenue = Object.values(revenueByCurrency).reduce((sum, val) => sum + val, 0);
        const mrr = Object.values(mrrByCurrency).reduce((sum, val) => sum + val, 0);
        const arr = mrr * 12;

        // Count subscriptions by plan
        const planCounts: Record<string, { count: number; planName: string; price: number; revenue: number; currency: string }> = {};
        for (const sub of activeSubscriptions) {
          const planId = sub.plan.id;
          const currency = countryCurrencyMap[sub.tenant?.country || ''] || 'EUR';
          if (!planCounts[planId]) {
            planCounts[planId] = {
              count: 0,
              planName: sub.plan.displayName || sub.plan.name,
              price: Number(sub.plan.price),
              revenue: 0,
              currency,
            };
          }
          planCounts[planId].count++;
          planCounts[planId].revenue += Number(sub.plan.price);
        }

        const subscriptionsByPlan = Object.values(planCounts).sort((a, b) => b.revenue - a.revenue);

        // Total tenants for ARPU calculation
        const totalActiveTenants = await this.prisma.tenant.count({ where: { isActive: true } });
        const arpu = totalActiveTenants > 0 ? mrr / totalActiveTenants : 0;

        // Churn rate: cancelled in last 30 days / total active at start of period
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cancelledLast30Days = await this.prisma.subscription.count({
          where: {
            status: 'CANCELED',
            updatedAt: { gte: thirtyDaysAgo },
          },
        });
        const totalSubscriptions = await this.prisma.subscription.count();
        const churnRate = totalSubscriptions > 0 ? (cancelledLast30Days / totalSubscriptions) * 100 : 0;

        // Monthly trend (last 12 months) grouped by currency
        const monthlyTrend: { month: string; revenue: number; subscriptions: number }[] = [];
        const monthlyTrendByCurrency: Record<string, { month: string; revenue: number }[]> = {};
        
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
          const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
          const monthKey = startOfMonth.toISOString().slice(0, 7);

          // Get payments for this month
          const monthPayments = await this.prisma.tenantSubscriptionPayment.findMany({
            where: {
              status: 'SUCCEEDED',
              createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
          });

          // Group by currency for this month
          const monthRevenueByCurrency: Record<string, number> = {};
          let monthTotalRevenue = 0;
          for (const payment of monthPayments) {
            const currency = payment.currency || 'EUR';
            if (!monthRevenueByCurrency[currency]) {
              monthRevenueByCurrency[currency] = 0;
            }
            monthRevenueByCurrency[currency] += Number(payment.amount);
            monthTotalRevenue += Number(payment.amount);
          }

          // Add to currency-specific trends
          for (const [currency, amount] of Object.entries(monthRevenueByCurrency)) {
            if (!monthlyTrendByCurrency[currency]) {
              monthlyTrendByCurrency[currency] = [];
            }
            monthlyTrendByCurrency[currency].push({ month: monthKey, revenue: amount });
          }

          const newSubs = await this.prisma.subscription.count({
            where: {
              createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
          });

          monthlyTrend.push({
            month: monthKey,
            revenue: monthTotalRevenue,
            subscriptions: newSubs,
          });
        }

        return {
          totalRevenue,
          mrr,
          arr,
          arpu,
          churnRate,
          activeSubscriptions: activeSubscriptions.length,
          subscriptionsByPlan,
          monthlyTrend,
          // New multi-currency fields
          revenueByCurrency,
          mrrByCurrency,
          monthlyTrendByCurrency,
        };
      },
      600 // 10 minutes TTL
    );
  }

  // ============ SYSTEM STATS ============
  async getSystemStats() {
    return this.cacheService.getOrCompute(
      'admin:system_stats',
      async () => {
        const [
          totalTenants,
          activeTenants,
          totalVehicles,
          totalBookings,
          totalCustomers,
        ] = await Promise.all([
          this.prisma.tenant.count(),
          this.prisma.tenant.count({ where: { isActive: true } }),
          this.prisma.vehicle.count({ where: { deletedAt: null } }),
          this.prisma.booking.count(),
          this.prisma.customer.count(),
        ]);

        return {
          totalTenants,
          activeTenants,
          totalVehicles,
          totalBookings,
          totalCustomers,
        };
      },
      60 // 1 minute TTL
    );
  }

  // ============ TENANTS ============
  async getAllTenants(filters?: { status?: string; planId?: string; search?: string; limit?: number; offset?: number }) {
    const where: any = {};
    const limit = Math.min(filters?.limit || 100, 500); // Max 500 per request
    const offset = filters?.offset || 0;
    
    if (filters?.status === 'active') where.isActive = true;
    if (filters?.status === 'inactive') where.isActive = false;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          subscription: { include: { plan: true } },
          _count: {
            select: {
              users: true,
              vehicles: true,
              bookings: true,
              referrals: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return tenants.map(t => ({
      id: t.id,
      name: t.name,
      companyName: t.companyName,
      country: t.country,
      isActive: t.isActive,
      createdAt: t.createdAt,
      subscription: t.subscription ? {
        plan: t.subscription.plan.displayName,
        status: t.subscription.status,
        currentPeriodEnd: t.subscription.currentPeriodEnd,
      } : null,
      usage: {
        vehicles: t._count.vehicles,
        maxVehicles: t.subscription?.plan.maxVehicles || 0,
        users: t._count.users,
        maxUsers: t.subscription?.plan.maxUsers || 0,
      },
      bookingsCount: t._count.bookings,
      referralsCount: t._count.referrals,
    }));
  }

  async getTenantDetails(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
            createdAt: true,
            lastLoginAt: true,
          },
        },
        referrals: {
          include: {
            referred: true,
          },
        },
        referred: {
          include: {
            referrer: true,
          },
        },
        subscriptionPayments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { vehicles: true, users: true, bookings: true },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const usagePercent = {
      vehicles: tenant.subscription 
        ? Math.round((tenant._count.vehicles / tenant.subscription.plan.maxVehicles) * 100)
        : 0,
      users: tenant.subscription
        ? Math.round((tenant._count.users / tenant.subscription.plan.maxUsers) * 100)
        : 0,
    };

    return {
      ...tenant,
      usagePercent,
    };
  }

  async updateTenant(id: string, dto: {
    name?: string;
    companyName?: string;
    vatNumber?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    isActive?: boolean;
  }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Soft delete a tenant (deactivate and mark as deleted)
   */
  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true, vehicles: true, users: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Soft delete: deactivate tenant
    await this.prisma.tenant.update({
      where: { id },
      data: { 
        isActive: false,
        name: `[DELETED] ${tenant.name}`,
      },
    });

    // Cancel any active subscription
    await this.prisma.subscription.updateMany({
      where: { tenantId: id, status: { in: ['ACTIVE', 'TRIAL'] } },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });

    return { 
      deleted: true, 
      message: 'Tenant deactivated and marked as deleted',
      stats: tenant._count,
    };
  }

  /**
   * Impersonate a tenant - generate a token to login as their admin
   */
  async impersonateTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { role: { name: 'ADMIN' } },
          take: 1,
          include: { role: true },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.users.length === 0) throw new Error('No admin user found for this tenant');

    const adminUser = tenant.users[0];

    // Generate JWT token for the admin user
    const token = this.jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      tenantId: tenant.id,
      role: adminUser.role.name,
      impersonated: true,
    });

    // Log impersonation
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUser.id,
        action: 'IMPERSONATION',
        resource: 'TENANT',
        resourceId: tenantId,
        details: { impersonatedBy: 'SUPERADMIN' },
      },
    });

    return {
      success: true,
      token,
      tenant: { id: tenant.id, name: tenant.name, companyName: tenant.companyName },
      user: { id: adminUser.id, email: adminUser.email, name: `${adminUser.firstName} ${adminUser.lastName}` },
    };
  }

  // ============ USER PASSWORD RESET ============
  async resetUserPassword(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) throw new NotFoundException('User not found');

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        passwordResetAt: new Date(),
      },
    });

    // Log the password reset activity
    await this.prisma.userActivityLog.create({
      data: {
        userId,
        action: 'PASSWORD_RESET',
        details: { resetBy: 'SUPERADMIN' },
      },
    });

    return { 
      success: true, 
      temporaryPassword: tempPassword,
      message: 'Password reset. Send this temporary password to the user.',
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 10 }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  async getAllReferrals(limit = 100, offset = 0) {
    const safeLimit = Math.min(limit, 500); // Max 500 per request
    return this.cacheService.getOrCompute(
      `admin:referrals:${safeLimit}:${offset}`,
      async () => {
        return this.prisma.referral.findMany({
          include: {
            referrer: true,
            referred: true,
          },
          orderBy: { createdAt: 'desc' },
          take: safeLimit,
          skip: offset,
        });
      },
      120 // 2 minutes cache
    );
  }

  async getReferralStats() {
    return this.cacheService.getOrCompute(
      'admin:referral_stats',
      async () => {
        const [total, pending, qualified, paidOut] = await Promise.all([
          this.prisma.referral.count(),
          this.prisma.referral.count({ where: { status: 'PENDING' } }),
          this.prisma.referral.count({ where: { status: 'QUALIFIED' } }),
          this.prisma.referral.count({ where: { status: 'PAID_OUT' } }),
        ]);

        // Top referrers
        const topReferrers = await this.prisma.tenant.findMany({
          select: {
            id: true,
            name: true,
            companyName: true,
            referralCode: true,
            _count: { select: { referrals: true } },
          },
          orderBy: { referrals: { _count: 'desc' } },
          take: 10,
        });

        return { total, pending, qualified, paidOut, topReferrers };
      },
      300 // 5 minutes cache
    );
  }

  async getTenantPayments(tenantId: string) {
    return this.prisma.tenantSubscriptionPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ ACTIVITY LOGS ============
  async getUserActivityLogs(userId: string, limit = 50) {
    return this.prisma.userActivityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTenantActivityLogs(tenantId: string, limit = 100) {
    return this.prisma.userActivityLog.findMany({
      where: {
        user: { tenantId },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getGlobalActivityLogs(limit = 100) {
    return this.prisma.userActivityLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            tenant: {
              select: { id: true, name: true, companyName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ============ SUBSCRIPTION MANAGEMENT ============

  /**
   * Manually activate a subscription (for cash/bank transfer payments)
   */
  async activateSubscription(tenantId: string, planId: string, durationMonths: number = 12, paymentMethod: string = 'MANUAL') {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const now = new Date();
    const currentEnd = tenant.subscription?.currentPeriodEnd && tenant.subscription.currentPeriodEnd > now
      ? tenant.subscription.currentPeriodEnd 
      : now;
    
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + durationMonths);

    // Calculate amount based on plan price and duration
    const planPrice = Number(plan.price);
    const yearlyPrice = plan.yearlyPrice ? Number(plan.yearlyPrice) : null;
    const basePrice = durationMonths >= 12 ? (yearlyPrice || planPrice * 10) : planPrice;
    const amount = durationMonths >= 12 ? basePrice : (basePrice * durationMonths);

    // Update or create subscription
    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId,
        status: 'ACTIVE',
        interval: durationMonths >= 12 ? 'YEARLY' : 'MONTHLY',
        currentPeriodStart: now,
        currentPeriodEnd: newEnd,
        paymentMethod,
        lastPaymentStatus: 'PENDING',
        lastPaymentDate: now,
      },
      update: {
        planId,
        status: 'ACTIVE',
        interval: durationMonths >= 12 ? 'YEARLY' : 'MONTHLY',
        currentPeriodEnd: newEnd, 
        paymentMethod,
        lastPaymentStatus: 'PENDING',
        lastPaymentDate: now,
      },
    });

    // Ensure tenant is active
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: true },
    });

    // Create payment record with PENDING status
    await this.prisma.tenantSubscriptionPayment.create({
      data: {
        tenantId,
        amount,
        currency: 'EUR',
        provider: paymentMethod,
        status: 'PENDING',
        description: `Subscription activation - ${plan.displayName} (${durationMonths} months)`,
      },
    });

    return subscription;
  }


  /**
   * Change subscription plan only (no date modifications)
   */
  async changePlan(tenantId: string, planId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.subscription.update({
      where: { tenantId },
      data: { planId },
      include: { plan: true },
    });
  }


  /**
   * Add a manual payment (e.g., cash payment)
   */
  async addPayment(tenantId: string, amount: number, paymentMethod: string, notes?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const payment = await this.prisma.tenantSubscriptionPayment.create({
      data: {
        tenantId,
        amount,
        currency: 'EUR',
        provider: paymentMethod,
        status: 'SUCCEEDED',
        description: notes,
      },
    });

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'PAYMENT_ADDED',
        resource: 'SUBSCRIPTION_PAYMENT',
        resourceId: payment.id,
        details: { amount, paymentMethod, notes },
      },
    });

    return payment;
  }

  /**
   * Update payment status (e.g., PENDING → SUCCEEDED)
   */
  async updatePaymentStatus(paymentId: string, status: string) {
    const payment = await this.prisma.tenantSubscriptionPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.tenantSubscriptionPayment.update({
      where: { id: paymentId },
      data: { status: status as any },
    });

    // If payment is now succeeded, update subscription last payment status via tenantId
    if (status === 'SUCCEEDED' && payment.tenantId) {
      await this.prisma.subscription.updateMany({
        where: { tenantId: payment.tenantId },
        data: {
          lastPaymentStatus: 'SUCCEEDED',
          lastPaymentDate: new Date(),
        },
      });
    }

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        tenantId: payment.tenantId,
        action: 'PAYMENT_STATUS_UPDATED',
        resource: 'SUBSCRIPTION_PAYMENT',
        resourceId: paymentId,
        details: { oldStatus: payment.status, newStatus: status },
      },
    });

    return updated;
  }

  /**
   * Daily check for expired subscriptions
   * Runs at 00:01 every day
   */


  @Cron('1 0 * * *')
  async checkSubscriptionExpirations() {
    const now = new Date();
    
    // Find tenants with expired subscriptions that are still marked as active
    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        subscription: {
          currentPeriodEnd: { lt: now }, // Expired
          status: 'ACTIVE',
        },
      },
      select: { id: true, subscription: { select: { id: true } } },
    });

    if (expiredTenants.length === 0) return;

    this.logger.log(`Found ${expiredTenants.length} expired tenants. Deactivating...`);

    for (const t of expiredTenants) {
      // 1. Mark subscription as PAST_DUE
      if (t.subscription) {
        await this.prisma.subscription.update({
          where: { id: t.subscription.id },
          data: { status: 'PAST_DUE' },
        });
      }

      // 2. Deactivate Tenant
      await this.prisma.tenant.update({
        where: { id: t.id },
        data: { isActive: false },
      });
      
      this.logger.log(`Tenant ${t.id} deactivated due to expiration.`);
    }
  }

  /**
   * Suspend a subscription (blocks access but keeps data)
   */
  async suspendSubscription(tenantId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscription.update({
      where: { tenantId },
      data: { 
        status: 'SUSPENDED',
        canceledAt: null, // Clear any cached cancellation
      },
    });

    // Deactivate tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: false },
    });

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'SUBSCRIPTION_SUSPENDED',
        resource: 'SUBSCRIPTION',
        resourceId: subscription.id,
        details: { reason: reason || 'Suspended by SuperAdmin' },
      },
    });

    return { success: true, status: 'SUSPENDED' };
  }

  /**
   * Cancel a subscription completely
   */
  async cancelSubscription(tenantId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscription.update({
      where: { tenantId },
      data: { 
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    // Deactivate tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: false },
    });

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'SUBSCRIPTION_CANCELED',
        resource: 'SUBSCRIPTION',
        resourceId: subscription.id,
        details: { reason: reason || 'Canceled by SuperAdmin' },
      },
    });

    return { success: true, status: 'CANCELED' };
  }

  /**
   * Reactivate a suspended/canceled subscription
   */
  async reactivateSubscription(tenantId: string, extensionDays: number = 0) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    let newEnd = subscription.currentPeriodEnd;
    
    // If subscription was expired, extend from now
    if (newEnd < now) {
      newEnd = new Date(now);
    }
    
    // Add or remove extension days if provided
    if (extensionDays !== 0) {
      newEnd = new Date(newEnd);
      newEnd.setDate(newEnd.getDate() + extensionDays);
    }

    // Check if the new end date is in the past - if so, deactivate
    if (newEnd < now) {
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { 
          status: 'PAST_DUE',
          currentPeriodEnd: newEnd,
        },
      });

      // Deactivate tenant
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: false },
      });
    } else {
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { 
          status: 'ACTIVE',
          currentPeriodEnd: newEnd,
          canceledAt: null,
        },
      });

      // Reactivate tenant
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: true },
      });
    }


    // Create payment record if extending days (positive days = extension fee)
    if (extensionDays > 0) {
      // Calculate extension fee (e.g., based on daily rate from subscription plan)
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: subscription.planId },
      });
      const dailyRate = plan ? (Number(plan.price) / 30) : 0;
      const extensionAmount = Math.round(dailyRate * extensionDays * 100) / 100;

      await this.prisma.tenantSubscriptionPayment.create({
        data: {
          tenantId,
          amount: extensionAmount || 0,
          currency: 'EUR',
          provider: 'MANUAL',
          status: 'PENDING',
          description: `Subscription extension - ${extensionDays} days`,
        },
      });

    }


    // Log the action
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'SUBSCRIPTION_REACTIVATED',
        resource: 'SUBSCRIPTION',
        resourceId: subscription.id,
        details: { extensionDays },
      },
    });

    return { success: true, status: 'ACTIVE', newEndDate: newEnd };
  }


  /**
   * Update subscription status directly
   */
  async updateSubscriptionStatus(tenantId: string, status: string, endDate?: Date) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updateData: any = { status };
    if (endDate) {
      updateData.currentPeriodEnd = endDate;
    }
    if (status === 'CANCELED') {
      updateData.canceledAt = new Date();
    } else {
      updateData.canceledAt = null;
    }

    await this.prisma.subscription.update({
      where: { tenantId },
      data: updateData,
    });

    // Update tenant isActive based on status
    const activeStatuses = ['ACTIVE', 'TRIAL'];
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: activeStatuses.includes(status) },
    });

    return { success: true, status };
  }

  // ============ CREATE TENANT ============
  
  /**
   * Create a new tenant with admin user and trial subscription
   */
  async createTenant(dto: {
    name: string;
    companyName?: string;
    subdomain: string;
    country?: string;
    adminEmail: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
  }) {
    // Check subdomain uniqueness
    const existing = await this.prisma.tenant.findUnique({
      where: { subdomain: dto.subdomain },
    });
    if (existing) {
      throw new Error('Subdomain already in use');
    }

    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Get default admin role
    const adminRole = await this.prisma.userRole.findFirst({
      where: { name: 'ADMIN' },
    });
    if (!adminRole) {
      throw new Error('Admin role not found. Please seed roles first.');
    }

    // Get default plan (Starter or first available)
    const defaultPlan = await this.prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    if (!defaultPlan) {
      throw new Error('No subscription plans found. Please seed plans first.');
    }

    // Generate referral code
    const referralCode = await this.generateReferralCode();

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

    // Create tenant with user and subscription in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          companyName: dto.companyName,
          subdomain: dto.subdomain,
          country: dto.country || 'AL',
          referralCode,
          isActive: true,
        },
      });

      // 2. Create Admin User
      const user = await tx.user.create({
        data: {
          email: dto.adminEmail,
          password: hashedPassword,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          roleId: adminRole.id,
          tenantId: tenant.id,
        },
      });

      // 3. Create Trial Subscription (14 days)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: defaultPlan.id,
          status: 'TRIAL',
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
          trialEndsAt,
        },
      });

      return { tenant, user, subscription };
    });

    return result;
  }

  private async generateReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let exists = true;
    
    while (exists) {
      const randomPart = Array.from({ length: 4 }, () => 
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
      code = `DN-${randomPart}`;
      
      const existing = await this.prisma.tenant.findUnique({
        where: { referralCode: code },
      });
      exists = !!existing;
    }
    return code!;
  }

  // ============ CREATE USER IN TENANT ============

  /**
   * Create a new user within a tenant
   */
  async createTenantUser(tenantId: string, dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId?: string;
  }) {
    // Check tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check user limit
    const currentUserCount = await this.prisma.user.count({ where: { tenantId } });
    const maxUsers = tenant.subscription?.plan?.maxUsers || 1;
    if (currentUserCount >= maxUsers) {
      throw new Error(`User limit reached (${maxUsers}). Upgrade subscription to add more users.`);
    }

    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Get role (default to STAFF if not specified)
    let roleId = dto.roleId;
    if (!roleId) {
      const defaultRole = await this.prisma.userRole.findFirst({
        where: { name: 'STAFF' },
      });
      if (!defaultRole) {
        throw new Error('Default role not found');
      }
      roleId = defaultRole.id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Delete a user from a tenant
   */
  async deleteTenantUser(tenantId: string, userId: string) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Verify user exists and belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found in this tenant');
    }

    // Check if this is the last admin
    const adminCount = await this.prisma.user.count({
      where: {
        tenantId,
        role: { name: 'ADMIN' },
      },
    });
    const isAdmin = await this.prisma.user.findFirst({
      where: { id: userId, role: { name: 'ADMIN' } },
    });
    if (isAdmin && adminCount <= 1) {
      throw new Error('Cannot delete the last admin user');
    }

    // Delete user
    await this.prisma.user.delete({ where: { id: userId } });

    return { deleted: true, message: 'User deleted successfully' };
  }


  // ============ TRIAL MANAGEMENT ============

  /**
   * Start or extend trial for a tenant
   */
  async setTrial(tenantId: string, trialDays: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const now = new Date();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    if (tenant.subscription) {
      // Update existing subscription
      const subscription = await this.prisma.subscription.update({
        where: { id: tenant.subscription.id },
        data: {
          status: 'TRIAL',
          currentPeriodEnd: trialEndsAt,
          trialEndsAt,
        },
      });

      // Ensure tenant is active
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: true },
      });

      return subscription;
    } else {
      // Create new trial subscription
      const defaultPlan = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
      if (!defaultPlan) {
        throw new Error('No subscription plans found');
      }

      const subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          planId: defaultPlan.id,
          status: 'TRIAL',
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          trialEndsAt,
        },
      });

      // Ensure tenant is active
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: true },
      });

      return subscription;
    }
  }

  // ============ SUBSCRIPTION PLAN MANAGEMENT ============

  /**
   * Get all subscription plans (including inactive)
   */
  async getAllPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      include: {
        pricing: true,
        planFeatures: { include: { feature: true } },
        _count: { select: { subscriptions: true } },
      },
    });
  }

  /**
   * Create a new subscription plan
   */
  async createPlan(dto: {
    name: string;
    displayName: string;
    description?: string;
    price?: number;
    yearlyPrice?: number;
    currency?: string;
    maxVehicles: number;
    maxUsers?: number;
    maxLocations?: number;
    featureIds?: string[];
    sortOrder?: number;
  }) {
    // Check name uniqueness
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new Error('Plan name already exists');
    }

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        price: dto.price ?? 0, // Default 0, pricing set separately per country
        yearlyPrice: dto.yearlyPrice ?? (dto.price ? dto.price * 10 : 0),
        currency: dto.currency || 'EUR',
        maxVehicles: dto.maxVehicles,
        maxUsers: dto.maxUsers || 10,
        maxLocations: dto.maxLocations || 3,
        sortOrder: dto.sortOrder || 0,
        isActive: true,
        planFeatures: dto.featureIds?.length ? {
          create: dto.featureIds.map(featureId => ({ featureId })),
        } : undefined,
      },
      include: {
        planFeatures: { include: { feature: true } },
      },
    });

    // Invalidate cache
    await this.cacheService.delete('admin:subscription_plans');

    return plan;
  }

  /**
   * Update a subscription plan
   */
  async updatePlan(planId: string, dto: {
    displayName?: string;
    description?: string;
    price?: number;
    yearlyPrice?: number;
    maxVehicles?: number;
    maxUsers?: number;
    maxLocations?: number;
    featureIds?: string[];
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Extract featureIds from dto to handle separately
    const { featureIds, ...planData } = dto;

    // Update plan data
    const updated = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: planData,
    });

    // Update features if provided
    if (featureIds !== undefined) {
      // Delete existing feature associations
      await this.prisma.planFeature.deleteMany({ where: { planId } });
      
      // Create new feature associations
      if (featureIds.length > 0) {
        await this.prisma.planFeature.createMany({
          data: featureIds.map(featureId => ({ planId, featureId })),
        });
      }
    }

    // Invalidate cache
    await this.cacheService.delete('admin:subscription_plans');
    await this.cacheService.delete('subscription:plans:default');

    return this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        planFeatures: { include: { feature: true } },
      },
    });
  }

  /**
   * Delete (soft) a subscription plan
   */
  async deletePlan(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (plan._count.subscriptions > 0) {
      // Soft delete - just deactivate
      await this.prisma.subscriptionPlan.update({
        where: { id: planId },
        data: { isActive: false },
      });
      return { deleted: false, deactivated: true, message: 'Plan has active subscriptions, deactivated instead' };
    }

    // Hard delete
    await this.prisma.subscriptionPlan.delete({
      where: { id: planId },
    });

    // Invalidate cache
    await this.cacheService.delete('admin:subscription_plans');
    await this.cacheService.delete('subscription:plans:default');

    return { deleted: true };
  }

  /**
   * Set pricing for a plan in a specific country/currency
   */
  async setPlanPricing(planId: string, pricingData: Array<{
    country: string;
    currency: string;
    price: number;
    yearlyPrice: number;
  }>) {
    // Verify plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    // Delete existing pricing for this plan
    await this.prisma.planPricing.deleteMany({ where: { planId } });

    // Create new pricing entries
    if (pricingData && pricingData.length > 0) {
      await this.prisma.planPricing.createMany({
        data: pricingData.map(p => ({
          planId,
          country: p.country,
          currency: p.currency,
          price: p.price,
          yearlyPrice: p.yearlyPrice,
        })),
      });
    }

    // Invalidate cache
    await this.cacheService.delete('admin:subscription_plans');
    await this.cacheService.delete('subscription:plans:default');

    return this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { pricing: true },
    });
  }

  /**
   * Get pricing for a specific plan
   */
  async getPlanPricing(planId: string) {
    return this.prisma.planPricing.findMany({
      where: { planId },
      orderBy: { country: 'asc' },
    });
  }

  // ============ FEATURES ============

  /**
   * Get all features
   */
  async getFeatures() {
    return this.prisma.feature.findMany({
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
      include: {
        _count: { select: { planFeatures: true } },
      },
    });
  }

  /**
   * Create a new feature
   */
  async createFeature(dto: {
    name: string;
    displayName: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }) {
    // Check name uniqueness
    const existing = await this.prisma.feature.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new Error('Feature name already exists');
    }

    return this.prisma.feature.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        icon: dto.icon,
        sortOrder: dto.sortOrder || 0,
        isActive: true,
      },
    });
  }

  /**
   * Update a feature
   */
  async updateFeature(featureId: string, dto: {
    displayName?: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
    });
    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return this.prisma.feature.update({
      where: { id: featureId },
      data: dto,
    });
  }

  /**
   * Delete a feature
   */
  async deleteFeature(featureId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { _count: { select: { planFeatures: true } } },
    });
    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    // If used by plans, just deactivate
    if (feature._count.planFeatures > 0) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: { isActive: false },
      });
      return { deactivated: true, message: 'Feature deactivated (used by plans)' };
    }

    await this.prisma.feature.delete({ where: { id: featureId } });
    return { deleted: true };
  }

  // ==================== ROLES ====================

  /**
   * Get all roles
   */
  async getRoles() {
    return this.prisma.userRole.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new role
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissions?: string[];
  }) {
    // Check name uniqueness
    const existing = await this.prisma.userRole.findUnique({
      where: { name: data.name.toUpperCase() },
    });
    if (existing) {
      throw new Error('Role name already exists');
    }

    return this.prisma.userRole.create({
      data: {
        name: data.name.toUpperCase(),
        description: data.description,
        permissions: data.permissions || [],
      },
    });
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ) {
    const role = await this.prisma.userRole.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check name uniqueness if changing
    if (data.name && data.name.toUpperCase() !== role.name) {
      const existing = await this.prisma.userRole.findUnique({
        where: { name: data.name.toUpperCase() },
      });
      if (existing) {
        throw new Error('Role name already exists');
      }
    }

    return this.prisma.userRole.update({
      where: { id: roleId },
      data: {
        name: data.name?.toUpperCase(),
        description: data.description,
        permissions: data.permissions,
      },
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string) {
    const role = await this.prisma.userRole.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Cannot delete if users are using this role
    if (role._count.users > 0) {
      throw new Error(`Cannot delete role: ${role._count.users} users are using it`);
    }

    await this.prisma.userRole.delete({ where: { id: roleId } });
    return { deleted: true };
  }
}
