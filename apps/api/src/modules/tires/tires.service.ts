import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { MetricsService } from '../../common/services/metrics.service';
import { CreateTireDto, UpdateTireDto, TireFilterDto, StoreTireDto } from './dto/tire.dto';
import { Tire } from '@prisma/client';
import { QueueService } from '../../common/queue/queue.service';


@Injectable()
export class TiresService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private metricsService: MetricsService,
    private queueService: QueueService,
  ) {}

  async create(tenantId: string, data: CreateTireDto, userId: string): Promise<Tire> {
    const tire = await this.prisma.createWithTenant('tire', tenantId, data);
    
    await this.auditService.log(tenantId, 'CREATE_TIRE', 'Tire', tire.id, userId, null, tire);
    return tire;
  }

  async findAll(tenantId: string, filters: TireFilterDto) {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }
    if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }
    if (filters.season) {
      where.season = filters.season;
    }
    if (filters.position) {
      where.position = filters.position;
    }
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    const [tires, total] = await Promise.all([
      this.prisma.tire.findMany({
        where,
        include: { vehicle: true },
        skip,
        take: limit,
        orderBy: { [filters.sortBy || 'mountDate']: filters.order || 'desc' },
      }),
      this.prisma.tire.count({ where }),
    ]);

    return { tires, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<Tire> {
    const tire = await this.prisma.tire.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
      },
    });

    if (!tire) {
      throw new NotFoundException('Tire not found');
    }

    return tire;
  }

  async update(tenantId: string, id: string, data: UpdateTireDto, userId: string): Promise<Tire> {
    const tire = await this.prisma.tire.findFirst({
      where: { id, tenantId },
    });

    if (!tire) {
      throw new NotFoundException('Tire not found');
    }

    const oldValues = { ...tire };

    const updatedTire = await this.prisma.tire.update({
      where: { id },
      data: {
        ...data,
      },
    });

    // Audit log
    await this.auditService.log(tenantId, 'UPDATE_TIRE', 'Tire', id, userId, oldValues, updatedTire);

    return updatedTire;
  }

  async store(tenantId: string, id: string, data: StoreTireDto, userId: string): Promise<Tire> {
    const tire = await this.prisma.tire.findFirst({
      where: { id, tenantId },
    });

    if (!tire) {
      throw new NotFoundException('Tire not found');
    }

    if (!tire.vehicleId) {
      throw new BadRequestException('Tire is already stored');
    }

    const oldValues = { ...tire };

    // Unmount from vehicle
    await this.prisma.tire.update({
      where: { id },
      data: {
        vehicleId: undefined,
      } as any,
    });

    const updatedTire = await this.prisma.tire.update({
      where: { id },
      data: {
        location: data.location,
        season: data.season || tire.season,
      },
    });

    // Audit log
    await this.auditService.log(tenantId, 'STORE_TIRE', 'Tire', id, userId, oldValues, updatedTire);

    return updatedTire;
  }

  async getWearAlerts(tenantId: string): Promise<Tire[]> {
    const wearThreshold = 40000; // Configurable via SystemConfig

    // Fetch all tires with vehicles to avoid Prisma null filter issues
    const tires = await this.prisma.tire.findMany({
      where: { tenantId },
      include: { vehicle: true },
    });

    // Filter in memory: only mounted tires (vehicleId not null) with wear above threshold
    return tires.filter(tire => {
      if (!tire.vehicleId || !tire.vehicle) return false;
      const currentKm = tire.vehicle.currentKm;
      const mountKm = tire.mountKm;
      return (currentKm - mountKm) > wearThreshold;
    });
  }

  async getStats(tenantId: string, startFrom?: string, endTo?: string, search?: string) {
    const where: any = { tenantId };
    
    // Apply date filter - filter by mountDate
    if (startFrom || endTo) {
      where.mountDate = {};
      if (startFrom) where.mountDate.gte = new Date(startFrom);
      if (endTo) where.mountDate.lte = new Date(endTo);
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch all tires and calculate stats in memory to avoid Prisma null filter issues
    const allTires = await this.prisma.tire.findMany({
      where,
      include: { vehicle: true },
    });

    const total = allTires.length;
    const mounted = allTires.filter(t => t.vehicleId !== null).length;
    const stored = allTires.filter(t => t.vehicleId === null).length;

    // Calculate wear stats
    const wearThreshold = 40000;
    let needReplacement = 0;
    
    for (const tire of allTires) {
      if (tire.vehicleId && tire.vehicle) {
        const vehicleCurrentKm = tire.vehicle.currentKm || 0;
        const mountKm = tire.mountKm;
        if ((vehicleCurrentKm - mountKm) > wearThreshold) {
          needReplacement++;
        }
      }
    }

    return {
      total,
      mounted,
      stored,
      needReplacement,
    };
  }

  async remove(tenantId: string, id: string, userId: string): Promise<void> {
    const tire = await this.prisma.tire.findFirst({
      where: { id, tenantId },
    });

    if (!tire) {
      throw new NotFoundException('Tire not found');
    }

    // Hard delete since soft delete is not supported by schema
    await this.prisma.tire.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log(tenantId, 'DELETE_TIRE', 'Tire', id, userId, tire, null);
  }
}