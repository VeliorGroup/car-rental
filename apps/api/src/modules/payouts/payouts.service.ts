import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PayoutStatus, BookingStatus, PaymentStatus } from '@prisma/client';
import { PayoutFilterDto, WalletSummaryDto } from './dto/payouts.dto';
import { addDays, startOfWeek, endOfWeek } from 'date-fns';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(private prisma: PrismaService) {}

  async getWalletSummary(tenantId: string): Promise<WalletSummaryDto> {
    // Get all marketplace bookings with successful payments
    const marketplaceBookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        isPublicBooking: true,
        deletedAt: null,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_OUT, BookingStatus.CHECKED_IN] },
        payments: {
          some: { status: PaymentStatus.SUCCEEDED },
        },
      },
      select: {
        id: true,
        tenantEarnings: true,
        platformFee: true,
        totalAmount: true,
      },
    });

    // Get completed payouts
    const completedPayouts = await this.prisma.payout.aggregate({
      where: {
        tenantId,
        status: PayoutStatus.COMPLETED,
      },
      _sum: { amount: true },
    });

    // Get pending payouts
    const pendingPayouts = await this.prisma.payout.aggregate({
      where: {
        tenantId,
        status: { in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING] },
      },
      _sum: { amount: true },
    });

    // Get next scheduled payout
    const nextPayout = await this.prisma.payout.findFirst({
      where: {
        tenantId,
        status: PayoutStatus.PENDING,
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Calculate totals
    const totalGrossEarnings = marketplaceBookings.reduce(
      (sum, b) => sum + (b.totalAmount?.toNumber() || 0),
      0,
    );
    const totalTenantEarnings = marketplaceBookings.reduce(
      (sum, b) => sum + (b.tenantEarnings?.toNumber() || 0),
      0,
    );
    const totalPlatformFees = marketplaceBookings.reduce(
      (sum, b) => sum + (b.platformFee?.toNumber() || 0),
      0,
    );
    const totalPaidOut = completedPayouts._sum.amount?.toNumber() || 0;
    const pendingBalance = totalTenantEarnings - totalPaidOut - (pendingPayouts._sum.amount?.toNumber() || 0);

    return {
      pendingBalance: Math.round(pendingBalance * 100) / 100,
      totalPaidOut: Math.round(totalPaidOut * 100) / 100,
      totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
      totalGrossEarnings: Math.round(totalGrossEarnings * 100) / 100,
      nextPayout: nextPayout
        ? {
            amount: nextPayout.amount.toNumber(),
            scheduledFor: nextPayout.scheduledFor,
          }
        : null,
      marketplaceBookings: marketplaceBookings.length,
    };
  }

  async getPayouts(tenantId: string, filters: PayoutFilterDto) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const whereClause: any = { tenantId };
    if (status) {
      whereClause.status = status;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payout.count({ where: whereClause }),
    ]);

    return {
      payouts: payouts.map(p => ({
        id: p.id,
        amount: p.amount.toNumber(),
        currency: p.currency,
        status: p.status,
        scheduledFor: p.scheduledFor,
        processedAt: p.processedAt,
        transactionId: p.transactionId,
        createdAt: p.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEarningsBreakdown(tenantId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      tenantId,
      isPublicBooking: true,
      deletedAt: null,
      payments: {
        some: { status: PaymentStatus.SUCCEEDED },
      },
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        totalAmount: true,
        tenantEarnings: true,
        platformFee: true,
        vehicle: {
          select: { brand: true, model: true },
        },
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return bookings.map(b => ({
      id: b.id,
      date: b.createdAt,
      vehicle: `${b.vehicle.brand} ${b.vehicle.model}`,
      customer: `${b.customer.firstName} ${b.customer.lastName}`,
      grossAmount: b.totalAmount?.toNumber() || 0,
      platformFee: b.platformFee?.toNumber() || 0,
      netEarnings: b.tenantEarnings?.toNumber() || 0,
    }));
  }

  // Scheduled job: Create weekly payout entries
  @Cron(CronExpression.EVERY_WEEK)
  async createWeeklyPayouts() {
    this.logger.log('Running weekly payout creation job');

    const settings = await this.prisma.platformSettings.findFirst();
    const minimumPayout = settings?.minimumPayout?.toNumber() || 50;

    // Get all active tenants with marketplace bookings
    const tenants = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        bookings: {
          some: {
            isPublicBooking: true,
            payments: { some: { status: PaymentStatus.SUCCEEDED } },
          },
        },
      },
    });

    for (const tenant of tenants) {
      try {
        const summary = await this.getWalletSummary(tenant.id);
        
        if (summary.pendingBalance >= minimumPayout) {
          await this.prisma.payout.create({
            data: {
              tenantId: tenant.id,
              amount: summary.pendingBalance,
              currency: 'EUR',
              status: PayoutStatus.PENDING,
              scheduledFor: addDays(new Date(), 3), // Payout in 3 days
            },
          });

          this.logger.log(
            `Created payout of €${summary.pendingBalance} for tenant ${tenant.name}`,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to create payout for tenant ${tenant.id}: ${errorMessage}`);
      }
    }
  }

  // Manual trigger for admin
  async processPayouts() {
    const pendingPayouts = await this.prisma.payout.findMany({
      where: {
        status: PayoutStatus.PENDING,
        scheduledFor: { lte: new Date() },
      },
      include: { tenant: true },
    });

    for (const payout of pendingPayouts) {
      try {
        // Mark as processing
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: { status: PayoutStatus.PROCESSING },
        });

        // TODO: Integrate with actual payment provider for bank transfers
        // For now, simulate successful processing
        const transactionId = `PAY-${Date.now()}-${payout.id.substring(0, 8)}`;

        await this.prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.COMPLETED,
            processedAt: new Date(),
            transactionId,
          },
        });

        this.logger.log(`Processed payout ${payout.id} for tenant ${payout.tenant.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.FAILED,
            notes: errorMessage,
          },
        });
        this.logger.error(`Failed to process payout ${payout.id}: ${errorMessage}`);
      }
    }

    return { processed: pendingPayouts.length };
  }
}
