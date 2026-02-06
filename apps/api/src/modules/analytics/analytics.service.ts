import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DashboardKpiDto, TcoQueryDto, ProfitReportQueryDto, VehicleMetricsDto, MonthlyMetricsDto } from './dto/analytics.dto';
import { VehicleCategory } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { RedisCacheService } from '../../common/services/redis-cache.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private cacheService: RedisCacheService,
  ) {}

  /**
   * Get dashboard KPIs (Cached for 5 minutes)
   */
  async getDashboardKpis(tenantId: string): Promise<DashboardKpiDto> {
    return this.cacheService.getOrCompute(
      `dashboard:kpis:${tenantId}`,
      async () => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Count total and available vehicles
        const [totalVehicles, availableVehicles] = await Promise.all([
          this.prisma.vehicle.count({ where: { tenantId, deletedAt: null } }),
          this.prisma.vehicle.count({ where: { tenantId, status: 'AVAILABLE', deletedAt: null } }),
        ]);

        // Count active bookings (CONFIRMED or CHECKED_OUT)
        const activeBookings = await this.prisma.booking.count({
          where: {
            tenantId,
            status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
          },
        });

        // Calculate today's revenue from completed bookings
        const todayRevenueResult = await this.prisma.booking.aggregate({
          where: {
            tenantId,
            status: 'CHECKED_IN',
            checkInData: {
              path: ['timestamp'],
              gte: todayStart,
              lt: todayEnd,
            },
          },
          _sum: {
            totalAmount: true,
          },
        });

        // Calculate total revenue from completed bookings
        const totalRevenueResult = await this.prisma.booking.aggregate({
          where: {
            tenantId,
            status: 'CHECKED_IN',
          },
          _sum: {
            totalAmount: true,
          },
        });

        // Count open maintenances
        const openMaintenance = await this.prisma.maintenance.count({
          where: {
            tenantId,
            status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] },
          },
        });

        // Count cautions to release (HELD status)
        const cautionsToRelease = await this.prisma.caution.count({
          where: {
            tenantId,
            status: 'HELD',
          },
        });

        // Count pending damages (REPORTED status)
        const pendingDamages = await this.prisma.damage.count({
          where: {
            tenantId,
            status: 'REPORTED',
          },
        });

        // Count expiring licenses (next 30 days)
        const licenseExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringLicenses = await this.prisma.customer.count({
          where: {
            tenantId,
            licenseExpiry: {
              lte: licenseExpiryDate,
              gt: now,
            },
            status: 'ACTIVE',
          },
        });

        // Count expiring insurances (next 30 days)
        const insuranceExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringInsurances = await this.prisma.vehicle.count({
          where: {
            tenantId,
            insuranceExpiry: {
              lte: insuranceExpiryDate,
              gt: now,
            },
            deletedAt: null,
          },
        });

        return {
          totalVehicles,
          availableVehicles,
          activeBookings,
          todayRevenue: Number(todayRevenueResult._sum.totalAmount || 0),
          totalRevenue: Number(totalRevenueResult._sum.totalAmount || 0),
          openMaintenance,
          cautionsToRelease,
          pendingDamages,
          expiringLicenses,
          expiringInsurances,
        };
      },
      300 // 5 minutes TTL
    );
  }

  /*
   * Private method (previously the body of getDashboardKpis) - removed here as logic is moved inside callback
   */

  /**
   * Get today's vehicle movements (checkouts and returns)
   */
  async getTodayMovements(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Get bookings starting today (checkouts)
    const checkoutsToday = await this.prisma.booking.findMany({
      where: {
        tenantId,
        startDate: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            brand: true,
            model: true,
            licensePlate: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Get bookings ending today (returns)
    const returnsToday = await this.prisma.booking.findMany({
      where: {
        tenantId,
        endDate: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: { in: ['CHECKED_OUT'] },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            brand: true,
            model: true,
            licensePlate: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    return {
      checkouts: checkoutsToday.map((b) => ({
        id: b.id,
        vehicle: `${b.vehicle.brand} ${b.vehicle.model}`,
        licensePlate: b.vehicle.licensePlate,
        customer: `${b.customer.firstName} ${b.customer.lastName}`,
        customerPhone: b.customer.phone,
        time: b.startDate,
      })),
      returns: returnsToday.map((b) => ({
        id: b.id,
        vehicle: `${b.vehicle.brand} ${b.vehicle.model}`,
        licensePlate: b.vehicle.licensePlate,
        customer: `${b.customer.firstName} ${b.customer.lastName}`,
        customerPhone: b.customer.phone,
        time: b.endDate,
      })),
    };
  }

  /**
   * Get period analytics for date range
   */
  async getPeriodAnalytics(tenantId: string, startDate?: string, endDate?: string) {
    // If no dates provided, get all-time data
    const from = startDate ? new Date(startDate) : new Date('2020-01-01');
    const to = endDate ? new Date(endDate) : new Date();
    // Set end date to end of day
    to.setHours(23, 59, 59, 999);

    // Build date filter for bookings
    const dateFilter = startDate || endDate ? { startDate: { gte: from, lte: to } } : {};

    // Get bookings in period
    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        ...dateFilter,
      },
      include: {
        vehicle: true,
        customer: true,
      },
    });

    // Completed bookings for revenue
    const completedBookings = bookings.filter(b => b.status === 'CHECKED_IN');
    const activeBookingsInPeriod = bookings.filter(b => ['CONFIRMED', 'CHECKED_OUT'].includes(b.status));
    const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');

    // Calculate revenue
    const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const expectedRevenue = activeBookingsInPeriod.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    // Get unique vehicles booked
    const uniqueVehicleIds = [...new Set(bookings.map(b => b.vehicleId))];

    // Calculate booked days
    const totalBookedDays = bookings.reduce((sum, booking) => {
      const bookingStart = new Date(booking.startDate) < from ? from : new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate) > to ? to : new Date(booking.endDate);
      const days = Math.ceil((bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);

    // Get maintenance costs in period
    const maintenances = await this.prisma.maintenance.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        completedAt: { gte: from, lte: to },
      },
    });
    const maintenanceCost = maintenances.reduce((sum, m) => sum + Number(m.cost || 0), 0);

    // Get damage costs in period
    const damages = await this.prisma.damage.findMany({
      where: {
        tenantId,
        status: { in: ['REPAIRED', 'RESOLVED'] },
        createdAt: { gte: from, lte: to },
      },
    });
    const damageCost = damages.reduce((sum, d) => sum + Number(d.actualCost || d.estimatedCost || 0), 0);

    // Calculate total costs
    const totalCosts = maintenanceCost + damageCost;

    // Calculate profit/loss
    const profit = totalRevenue - totalCosts;
    const isProfit = profit >= 0;

    // Calculate utilization rate
    const totalVehicles = await this.prisma.vehicle.count({
      where: { tenantId, deletedAt: null },
    });
    const daysInPeriod = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const maxPossibleDays = totalVehicles * daysInPeriod;
    const utilizationRate = maxPossibleDays > 0 ? (totalBookedDays / maxPossibleDays) * 100 : 0;

    // Average daily revenue
    const avgDailyRevenue = daysInPeriod > 0 ? totalRevenue / daysInPeriod : 0;

    // Average booking value
    const avgBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

    return {
      period: {
        startDate: from.toISOString(),
        endDate: to.toISOString(),
        days: daysInPeriod,
      },
      bookings: {
        total: bookings.length,
        completed: completedBookings.length,
        active: activeBookingsInPeriod.length,
        cancelled: cancelledBookings.length,
      },
      vehicles: {
        totalBooked: uniqueVehicleIds.length,
        totalBookedDays,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
      },
      revenue: {
        total: totalRevenue,
        expected: expectedRevenue,
        avgDaily: Math.round(avgDailyRevenue * 100) / 100,
        avgBookingValue: Math.round(avgBookingValue * 100) / 100,
      },
      costs: {
        maintenance: maintenanceCost,
        damages: damageCost,
        total: totalCosts,
      },
      profitLoss: {
        amount: profit,
        isProfit,
        margin: totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100 * 100) / 100 : 0,
      },
    };
  }

  /**
   * Calculate Total Cost of Ownership (TCO) for a vehicle
   */
  async getVehicleTco(tenantId: string, vehicleId: string, query: TcoQueryDto): Promise<VehicleMetricsDto> {
    const from = query.from ? new Date(query.from) : new Date('2024-01-01');
    const to = query.to ? new Date(query.to) : new Date();

    // Get vehicle details
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Calculate total bookings and revenue
    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        vehicleId,
        status: 'CHECKED_IN',
        startDate: { gte: from, lte: to },
      },
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);

    // Calculate maintenance costs
    const maintenances = await this.prisma.maintenance.findMany({
      where: {
        tenantId,
        vehicleId,
        status: 'COMPLETED',
        completedAt: { gte: from, lte: to },
      },
    });

    const totalMaintenanceCost = maintenances.reduce((sum, maintenance) => {
      return sum + (maintenance.cost ? Number(maintenance.cost) : 0);
    }, 0);

    // Calculate damage costs
    const damages = await this.prisma.damage.findMany({
      where: {
        tenantId,
        vehicleId,
        status: { in: ['REPAIRED', 'RESOLVED'] },
        createdAt: { gte: from, lte: to },
      },
    });

    const totalDamageCost = damages.reduce((sum, damage) => {
      return sum + Number(damage.actualCost || damage.estimatedCost);
    }, 0);

    // Calculate TCO
    const purchasePrice = Number(vehicle.purchasePrice);
    const tco = purchasePrice + totalMaintenanceCost + totalDamageCost;
    const profit = totalRevenue - tco;
    const roi = (profit / purchasePrice) * 100;

    // Calculate utilization rate
    const daysInPeriod = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const bookedDays = bookings.reduce((sum, booking) => {
      const bookingDays = Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + bookingDays;
    }, 0);
    const utilizationRate = (bookedDays / daysInPeriod) * 100;

    return {
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      totalBookings,
      totalRevenue,
      totalMaintenanceCost,
      totalDamageCost,
      tco,
      profit,
      roi,
      utilizationRate,
    };
  }

  /**
   * Get vehicle profitability ranking for a period
   * OPTIMIZED: Uses batch queries instead of per-vehicle queries (N+1 fix)
   * CACHED: 5 minutes TTL
   */
  async getVehicleProfitabilityRanking(tenantId: string, startDate?: string, endDate?: string) {
    const cacheKey = `profitability:${tenantId}:${startDate || 'all'}:${endDate || 'all'}`;
    return this.cacheService.getOrCompute(
      cacheKey,
      async () => {
        // If no dates provided, get all-time data
        const from = startDate ? new Date(startDate) : new Date('2020-01-01');
        const to = endDate ? new Date(endDate) : new Date();
        to.setHours(23, 59, 59, 999);

        // Build date filters conditionally
        const bookingDateFilter = startDate || endDate ? { startDate: { gte: from, lte: to } } : {};
        const maintenanceDateFilter = startDate || endDate ? { completedAt: { gte: from, lte: to } } : {};
        const damageDateFilter = startDate || endDate ? { createdAt: { gte: from, lte: to } } : {};

        // Batch Query 1: Get all vehicles
        const vehicles = await this.prisma.vehicle.findMany({
          where: {
            tenantId,
            deletedAt: null,
          },
          select: {
            id: true,
            brand: true,
            model: true,
            licensePlate: true,
            category: true,
          },
        });

        const vehicleIds = vehicles.map(v => v.id);

        // Batch Query 2: Get all bookings for all vehicles in one query
        const allBookings = await this.prisma.booking.findMany({
          where: {
            tenantId,
            vehicleId: { in: vehicleIds },
            status: { in: ['CONFIRMED', 'CHECKED_OUT', 'CHECKED_IN'] },
            ...bookingDateFilter,
          },
          select: {
            vehicleId: true,
            totalAmount: true,
          },
        });

        // Batch Query 3: Get all maintenances for all vehicles in one query
        const allMaintenances = await this.prisma.maintenance.findMany({
          where: {
            tenantId,
            vehicleId: { in: vehicleIds },
            status: 'COMPLETED',
            ...maintenanceDateFilter,
          },
          select: {
            vehicleId: true,
            cost: true,
          },
        });

        // Batch Query 4: Get all damages for all vehicles in one query
        const allDamages = await this.prisma.damage.findMany({
          where: {
            tenantId,
            vehicleId: { in: vehicleIds },
            status: { in: ['REPAIRED', 'RESOLVED'] },
            ...damageDateFilter,
          },
          select: {
            vehicleId: true,
            actualCost: true,
            estimatedCost: true,
          },
        });

        // Aggregate data in-memory (O(n) complexity)
        const bookingsByVehicle = new Map<string, { count: number; revenue: number }>();
        for (const b of allBookings) {
          const current = bookingsByVehicle.get(b.vehicleId) || { count: 0, revenue: 0 };
          current.count++;
          current.revenue += Number(b.totalAmount || 0);
          bookingsByVehicle.set(b.vehicleId, current);
        }

        const maintenanceByVehicle = new Map<string, number>();
        for (const m of allMaintenances) {
          const current = maintenanceByVehicle.get(m.vehicleId) || 0;
          maintenanceByVehicle.set(m.vehicleId, current + Number(m.cost || 0));
        }

        const damageByVehicle = new Map<string, number>();
        for (const d of allDamages) {
          const current = damageByVehicle.get(d.vehicleId) || 0;
          damageByVehicle.set(d.vehicleId, current + Number(d.actualCost || d.estimatedCost || 0));
        }

        // Build metrics using aggregated data
        const vehicleMetrics = vehicles.map(vehicle => {
          const bookingData = bookingsByVehicle.get(vehicle.id) || { count: 0, revenue: 0 };
          const maintenanceCost = maintenanceByVehicle.get(vehicle.id) || 0;
          const damageCost = damageByVehicle.get(vehicle.id) || 0;
          const totalCosts = maintenanceCost + damageCost;
          const profit = bookingData.revenue - totalCosts;

          return {
            vehicleId: vehicle.id,
            vehicle: `${vehicle.brand} ${vehicle.model}`,
            licensePlate: vehicle.licensePlate,
            category: vehicle.category,
            bookings: bookingData.count,
            revenue: bookingData.revenue,
            maintenanceCost,
            damageCost,
            totalCosts,
            profit,
            isProfit: profit >= 0,
          };
        });

        // Sort by profit descending
        vehicleMetrics.sort((a, b) => b.profit - a.profit);

        return vehicleMetrics;
      },
      300 // 5 minutes TTL
    );
  }



  /**
   * Generate profitability report
   */
  async getProfitabilityReport(
    tenantId: string,
    query: ProfitReportQueryDto
  ): Promise<VehicleMetricsDto[] | Buffer> {
    const { category, location, startDate, endDate, format } = query;
    
    const from = startDate ? new Date(startDate) : new Date('2024-01-01');
    const to = endDate ? new Date(endDate) : new Date();

    // Get all vehicles matching filters
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(category && { category }),
        ...(location && { location }),
      },
    });

    // Calculate metrics for each vehicle
    const metrics = await Promise.all(
      vehicles.map(async (vehicle) => {
        return this.getVehicleTco(tenantId, vehicle.id, { from: from.toISOString(), to: to.toISOString() });
      })
    );

    // Filter profitable vehicles
    const profitableMetrics = metrics.filter(m => m.profit > 0);

    if (format === 'excel') {
      return this.generateExcelReport(profitableMetrics);
    }

    return profitableMetrics;
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(metrics: VehicleMetricsDto[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Profitability Report');

    // Add headers
    worksheet.columns = [
      { header: 'License Plate', key: 'licensePlate', width: 15 },
      { header: 'Total Bookings', key: 'totalBookings', width: 15 },
      { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
      { header: 'Maintenance Cost', key: 'totalMaintenanceCost', width: 18 },
      { header: 'Damage Cost', key: 'totalDamageCost', width: 15 },
      { header: 'TCO', key: 'tco', width: 15 },
      { header: 'Profit', key: 'profit', width: 15 },
      { header: 'ROI (%)', key: 'roi', width: 15 },
      { header: 'Utilization (%)', key: 'utilizationRate', width: 18 },
    ];

    // Add rows
    worksheet.addRows(metrics);

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Format currency columns
    const currencyCols = ['C', 'D', 'E', 'F', 'G'];
    currencyCols.forEach(col => {
      worksheet.getColumn(col).numFmt = '€#,##0.00';
    });

    // Format percentage columns
    worksheet.getColumn('H').numFmt = '0.00"%"';
    worksheet.getColumn('I').numFmt = '0.00"%"';

    // Auto-filter
    worksheet.autoFilter = 'A1:I1';

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  /**
   * Get monthly metrics for charts
   */
  async getMonthlyMetrics(tenantId: string, year: number): Promise<MonthlyMetricsDto[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    // Get monthly data using TimescaleDB time_bucket
    const monthlyData = await this.prisma.$queryRaw`
      SELECT 
        time_bucket('1 month', "timestamp") as month,
        COUNT(*) as bookings,
        SUM(value) as revenue
      FROM "Metric"
      WHERE tenant_id = ${tenantId}
        AND metric_name = 'booking_completed'
        AND "timestamp" >= ${startDate}
        AND "timestamp" < ${endDate}
      GROUP BY month
      ORDER BY month;
    `;

    // Get maintenance costs
    const maintenanceData = await this.prisma.$queryRaw`
      SELECT 
        time_bucket('1 month', completed_at) as month,
        SUM(cost) as maintenance_cost
      FROM "Maintenance"
      WHERE tenant_id = ${tenantId}
        AND status = 'COMPLETED'
        AND completed_at >= ${startDate}
        AND completed_at < ${endDate}
      GROUP BY month
      ORDER BY month;
    `;

    // Get damage costs
    const damageData = await this.prisma.$queryRaw`
      SELECT 
        time_bucket('1 month', created_at) as month,
        SUM(actual_cost) as damage_cost
      FROM "Damage"
      WHERE tenant_id = ${tenantId}
        AND status IN ('REPAIRED', 'RESOLVED')
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      GROUP BY month
      ORDER BY month;
    `;

    // Combine data
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(year, i, 1);
      const monthKey = monthDate.toISOString().slice(0, 7); // YYYY-MM

      const booking = (monthlyData as any[]).find((b: any) => b.month.toISOString().slice(0, 7) === monthKey);
      const maintenance = (maintenanceData as any[]).find((m: any) => m.month.toISOString().slice(0, 7) === monthKey);
      const damage = (damageData as any[]).find((d: any) => d.month.toISOString().slice(0, 7) === monthKey);

      const revenue = Number(booking?.revenue || 0);
      const maintenanceCost = Number(maintenance?.maintenance_cost || 0);
      const damageCost = Number(damage?.damage_cost || 0);
      const profit = revenue - maintenanceCost - damageCost;

      return {
        month: monthKey,
        bookings: Number(booking?.bookings || 0),
        revenue,
        maintenanceCost,
        damageCost,
        profit,
      };
    });

    return months;
  }

  /**
   * Get monthly trend for the last 12 months (simpler version without TimescaleDB)
   */
  async getMonthlyTrend(tenantId: string): Promise<{
    month: string;
    monthLabel: string;
    bookings: number;
    revenue: number;
    costs: number;
    profit: number;
  }[]> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Generate last 12 months
    const months: { month: string; monthLabel: string; startDate: Date; endDate: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      months.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM
        monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        startDate: date,
        endDate,
      });
    }

    // Fetch data for all months
    const results = await Promise.all(
      months.map(async ({ month, monthLabel, startDate, endDate }) => {
        // Get completed bookings revenue
        const bookingsData = await this.prisma.booking.findMany({
          where: {
            tenantId,
            status: 'CHECKED_IN',
            endDate: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            totalAmount: true,
          },
        });

        const bookingsCount = bookingsData.length;
        const revenue = bookingsData.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

        // Get maintenance costs
        const maintenanceData = await this.prisma.maintenance.aggregate({
          where: {
            tenantId,
            status: 'COMPLETED',
            completedAt: { gte: startDate, lte: endDate },
          },
          _sum: { cost: true },
        });
        const maintenanceCost = Number(maintenanceData._sum.cost || 0);

        // Get damage costs
        const damageData = await this.prisma.damage.aggregate({
          where: {
            tenantId,
            status: { in: ['REPAIRED', 'RESOLVED'] },
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { actualCost: true },
        });
        const damageCost = Number(damageData._sum.actualCost || 0);

        const costs = maintenanceCost + damageCost;
        const profit = revenue - costs;

        return {
          month,
          monthLabel,
          bookings: bookingsCount,
          revenue: Math.round(revenue * 100) / 100,
          costs: Math.round(costs * 100) / 100,
          profit: Math.round(profit * 100) / 100,
        };
      })
    );

    return results;
  }
}
