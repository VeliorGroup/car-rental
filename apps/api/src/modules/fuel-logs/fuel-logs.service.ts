import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateFuelLogDto, UpdateFuelLogDto, FuelLogFilterDto } from './dto/fuel-logs.dto';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

@Injectable()
export class FuelLogsService {
  private readonly logger = new Logger(FuelLogsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, data: CreateFuelLogDto, userId: string) {
    // Verify vehicle belongs to tenant
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: data.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Verify booking if provided
    if (data.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: data.bookingId, tenantId, vehicleId: data.vehicleId },
      });
      if (!booking) {
        throw new BadRequestException('Booking not found or does not match vehicle');
      }
    }

    // Calculate consumption if we have previous log with full tank
    let consumption = null;
    if (data.fullTank) {
      const previousLog = await this.prisma.fuelLog.findFirst({
        where: {
          vehicleId: data.vehicleId,
          fullTank: true,
          odometerReading: { lt: data.odometerReading },
        },
        orderBy: { odometerReading: 'desc' },
      });

      if (previousLog) {
        const distanceTraveled = data.odometerReading - previousLog.odometerReading;
        if (distanceTraveled > 0) {
          consumption = (data.liters / distanceTraveled) * 100; // L/100km
        }
      }
    }

    const fuelLog = await this.prisma.fuelLog.create({
      data: {
        tenantId,
        vehicleId: data.vehicleId,
        bookingId: data.bookingId,
        fuelType: data.fuelType,
        liters: data.liters,
        costPerLiter: data.costPerLiter,
        totalCost: data.totalCost,
        odometerReading: data.odometerReading,
        stationName: data.stationName,
        stationAddress: data.stationAddress,
        filledAt: data.filledAt ? new Date(data.filledAt) : new Date(),
        notes: data.notes,
        receiptUrl: data.receiptUrl,
        fullTank: data.fullTank ?? false,
        consumption,
        createdById: userId,
      },
      include: {
        vehicle: { select: { licensePlate: true, brand: true, model: true } },
        booking: { select: { id: true } },
      },
    });

    // Update vehicle mileage if higher
    if (data.odometerReading > vehicle.currentKm) {
      await this.prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: { currentKm: data.odometerReading },
      });
    }

    await this.auditService.log(
      tenantId,
      'CREATE_FUEL_LOG',
      'FuelLog',
      fuelLog.id,
      userId,
      null,
      { vehicleId: data.vehicleId, liters: data.liters, totalCost: data.totalCost },
    );

    return fuelLog;
  }

  async findAll(tenantId: string, filters: FuelLogFilterDto) {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.bookingId) where.bookingId = filters.bookingId;
    if (filters.fuelType) where.fuelType = filters.fuelType;

    if (filters.startDate || filters.endDate) {
      where.filledAt = {};
      if (filters.startDate) where.filledAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.filledAt.lte = new Date(filters.endDate);
    }

    const [fuelLogs, total] = await Promise.all([
      this.prisma.fuelLog.findMany({
        where,
        include: {
          vehicle: { select: { licensePlate: true, brand: true, model: true } },
          booking: { select: { id: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { filledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.fuelLog.count({ where }),
    ]);

    return { fuelLogs, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const fuelLog = await this.prisma.fuelLog.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: { select: { licensePlate: true, brand: true, model: true } },
        booking: { select: { id: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!fuelLog) {
      throw new NotFoundException('Fuel log not found');
    }

    return fuelLog;
  }

  async findByVehicle(tenantId: string, vehicleId: string, filters: FuelLogFilterDto) {
    return this.findAll(tenantId, { ...filters, vehicleId });
  }

  async update(tenantId: string, id: string, data: UpdateFuelLogDto, userId: string) {
    const fuelLog = await this.prisma.fuelLog.findFirst({
      where: { id, tenantId },
    });

    if (!fuelLog) {
      throw new NotFoundException('Fuel log not found');
    }

    const oldValues = { ...fuelLog };

    // Recalculate consumption if odometer or liters changed
    let consumption = fuelLog.consumption;
    if ((data.odometerReading || data.liters) && (data.fullTank ?? fuelLog.fullTank)) {
      const newOdometer = data.odometerReading ?? fuelLog.odometerReading;
      const newLiters = data.liters ?? fuelLog.liters;

      const previousLog = await this.prisma.fuelLog.findFirst({
        where: {
          vehicleId: fuelLog.vehicleId,
          fullTank: true,
          odometerReading: { lt: newOdometer },
          id: { not: id },
        },
        orderBy: { odometerReading: 'desc' },
      });

      if (previousLog) {
        const distanceTraveled = newOdometer - previousLog.odometerReading;
        if (distanceTraveled > 0) {
          consumption = (newLiters / distanceTraveled) * 100;
        }
      }
    }

    const updated = await this.prisma.fuelLog.update({
      where: { id },
      data: {
        ...data,
        consumption,
      },
      include: {
        vehicle: { select: { licensePlate: true, brand: true, model: true } },
      },
    });

    await this.auditService.log(
      tenantId,
      'UPDATE_FUEL_LOG',
      'FuelLog',
      id,
      userId,
      oldValues,
      updated,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, userId: string) {
    const fuelLog = await this.prisma.fuelLog.findFirst({
      where: { id, tenantId },
    });

    if (!fuelLog) {
      throw new NotFoundException('Fuel log not found');
    }

    await this.prisma.fuelLog.delete({ where: { id } });

    await this.auditService.log(
      tenantId,
      'DELETE_FUEL_LOG',
      'FuelLog',
      id,
      userId,
      fuelLog,
      null,
    );
  }

  async getVehicleStats(tenantId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));

    const [
      totalLogs,
      totalLiters,
      totalCost,
      avgConsumption,
      thisMonthCost,
      lastMonthCost,
    ] = await Promise.all([
      this.prisma.fuelLog.count({ where: { vehicleId, tenantId } }),
      this.prisma.fuelLog.aggregate({
        where: { vehicleId, tenantId },
        _sum: { liters: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { vehicleId, tenantId },
        _sum: { totalCost: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { vehicleId, tenantId, consumption: { not: null } },
        _avg: { consumption: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: {
          vehicleId,
          tenantId,
          filledAt: { gte: startOfCurrentMonth },
        },
        _sum: { totalCost: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: {
          vehicleId,
          tenantId,
          filledAt: { gte: startOfLastMonth, lt: startOfCurrentMonth },
        },
        _sum: { totalCost: true },
      }),
    ]);

    return {
      vehicleId,
      totalLogs,
      totalLiters: totalLiters._sum.liters || 0,
      totalCost: totalCost._sum.totalCost || 0,
      avgConsumption: avgConsumption._avg.consumption
        ? Number(avgConsumption._avg.consumption).toFixed(2)
        : null,
      thisMonthCost: thisMonthCost._sum.totalCost || 0,
      lastMonthCost: lastMonthCost._sum.totalCost || 0,
    };
  }

  async getFleetStats(tenantId: string) {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);

    const [totalCost, totalLiters, avgConsumption, byVehicle] = await Promise.all([
      this.prisma.fuelLog.aggregate({
        where: { tenantId, filledAt: { gte: startOfCurrentMonth } },
        _sum: { totalCost: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { tenantId, filledAt: { gte: startOfCurrentMonth } },
        _sum: { liters: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { tenantId, consumption: { not: null } },
        _avg: { consumption: true },
      }),
      this.prisma.fuelLog.groupBy({
        by: ['vehicleId'],
        where: { tenantId, filledAt: { gte: startOfCurrentMonth } },
        _sum: { totalCost: true, liters: true },
        _count: true,
      }),
    ]);

    // Get vehicle details
    const vehicleIds = byVehicle.map(v => v.vehicleId);
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, licensePlate: true, brand: true, model: true },
    });

    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    return {
      thisMonth: {
        totalCost: totalCost._sum.totalCost || 0,
        totalLiters: totalLiters._sum.liters || 0,
      },
      fleetAvgConsumption: avgConsumption._avg.consumption
        ? Number(avgConsumption._avg.consumption).toFixed(2)
        : null,
      byVehicle: byVehicle.map(v => ({
        vehicle: vehicleMap.get(v.vehicleId),
        cost: v._sum.totalCost,
        liters: v._sum.liters,
        fillCount: v._count,
      })),
    };
  }
}
