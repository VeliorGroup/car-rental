import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { MetricsService } from '../../common/services/metrics.service';
import { AuditService } from '../../common/services/audit.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { CreateVehicleDto, UpdateVehicleDto, VehicleFilterDto, VehiclePricingDto, PriceOverrideDto } from './dto/create-vehicle.dto';
import { Vehicle, VehicleStatus, VehicleCategory } from '@prisma/client';
import { addDays } from 'date-fns';
import { QueueService } from '../../common/queue/queue.service';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private metricsService: MetricsService,
    private auditService: AuditService,
    private queueService: QueueService,
    private cacheService: RedisCacheService,
  ) { }

  async create(tenantId: string, data: CreateVehicleDto, userId: string, photos?: Express.Multer.File[]): Promise<Vehicle> {
    this.logger.log(`VehiclesService.create called with data: ${JSON.stringify(data)}`);
    
    // Check if license plate already exists
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: { licensePlate: data.licensePlate, tenantId },
    });

    if (existingVehicle) {
      throw new ForbiddenException('License plate already exists');
    }

    // Upload and process photos
    const photoKeys: { key: string; order: number }[] = [];

    if (photos && photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const key = await this.storageService.uploadResizedImage(
          photo,
          `vehicles/${tenantId}/photos`,
          1200,
          800,
        );
        photoKeys.push({ key, order: i });
      }
    }

    const vehicle = await this.prisma.createWithTenant('vehicle', tenantId, {
      ...data,
      photos: photoKeys,
      currentKm: parseInt(data.currentKm.toString()),
      purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
      franchiseAmount: data.franchiseAmount ? parseFloat(data.franchiseAmount) : 500,
      purchaseDate: new Date(data.purchaseDate),
      insuranceExpiry: new Date(data.insuranceExpiry),
      reviewDate: new Date(data.reviewDate),
    });

    // Record metric
    await this.metricsService.recordEvent(tenantId, 'vehicle_created', 1, {
      category: data.category,
    });

    // Audit log
    await this.auditService.log(tenantId, 'CREATE_VEHICLE', 'Vehicle', vehicle.id, userId, null, vehicle);

    return vehicle;
  }

  async findAll(tenantId: string, filters: VehicleFilterDto): Promise<{
    vehicles: (Vehicle & { photoUrls?: Record<string, string>; calculatedKmPerTire?: number })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    // Apply filters
    if (filters.search) {
      where.OR = [
        { licensePlate: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
        { vin: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.model) {
      where.model = { contains: filters.model, mode: 'insensitive' };
    }

    if (filters.yearFrom) {
      where.year = { ...where.year, gte: filters.yearFrom };
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    // Build order by
    const orderBy = { [filters.sortBy || 'createdAt']: filters.order || 'desc' };

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          tires: {
            where: { location: null }, // Only mounted tires
            orderBy: { mountDate: 'desc' },
          },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    // Batch collect all photo keys to avoid N+1 presigned URL calls
    const allPhotoKeys: string[] = [];
    vehicles.forEach((vehicle) => {
      const keys = (vehicle.photos as any[])?.map(p => p.key).filter(Boolean) || [];
      allPhotoKeys.push(...keys);
    });

    // Single batch call for all presigned URLs
    const allUrlMap = allPhotoKeys.length > 0
      ? await this.storageService.getPresignedUrls(allPhotoKeys)
      : {};

    // Process vehicles using pre-fetched URL map
    const processedVehicles = vehicles.map((vehicle) => {
      const vehicleKeys = (vehicle.photos as any[])?.map(p => p.key).filter(Boolean) || [];
      const photoUrls: Record<string, string> = {};
      vehicleKeys.forEach(key => {
        if (allUrlMap[key]) photoUrls[key] = allUrlMap[key];
      });

      // Calculate average km per tire
      const mountedTires = vehicle.tires;
      const calculatedKmPerTire = mountedTires.length > 0
        ? Math.round(mountedTires.reduce((sum, tire) => sum + (vehicle.currentKm - tire.mountKm), 0) / mountedTires.length)
        : 0;

      return {
        ...vehicle,
        photoUrls,
        calculatedKmPerTire,
      };
    });

    return { vehicles: processedVehicles, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<Vehicle & { photoUrls?: Record<string, string>; calculatedKmPerTire?: number; currentTires?: any[] }> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        tires: {
          orderBy: { mountDate: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Generate presigned URLs for photos
    const photoUrls = await this.storageService.getPresignedUrls(
      (vehicle.photos as any[])?.map(p => p.key) || [],
    );

    // Calculate average km per tire
    const mountedTires = vehicle.tires.filter(tire => !tire.location);
    const calculatedKmPerTire = mountedTires.length > 0
      ? Math.round(mountedTires.reduce((sum, tire) => sum + (vehicle.currentKm - tire.mountKm), 0) / mountedTires.length)
      : 0;

    return {
      ...vehicle,
      photoUrls,
      calculatedKmPerTire,
      currentTires: mountedTires,
    };
  }

  async update(tenantId: string, id: string, data: UpdateVehicleDto, userId?: string, photos?: Express.Multer.File[]): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Check for active bookings
    const activeBookings = await this.prisma.booking.count({
      where: {
        vehicleId: id,
        status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
      },
    });

    if (activeBookings > 0 && data.status === VehicleStatus.OUT_OF_SERVICE) {
      throw new ForbiddenException('Cannot set vehicle to OUT_OF_SERVICE with active bookings');
    }

    // Check for future bookings when setting to OUT_OF_SERVICE or MAINTENANCE
    if (data.status === VehicleStatus.OUT_OF_SERVICE || data.status === VehicleStatus.MAINTENANCE) {
      const futureBookings = await this.prisma.booking.count({
        where: {
          vehicleId: id,
          status: 'CONFIRMED',
          startDate: { gt: new Date() },
        },
      });

      if (futureBookings > 0) {
        throw new ForbiddenException(`Cannot set vehicle to ${data.status} with ${futureBookings} future bookings`);
      }
    }

    // Validate km cannot be reduced
    if (data.currentKm && parseInt(data.currentKm.toString()) < vehicle.currentKm) {
      throw new ForbiddenException(`Km cannot be reduced. Current km: ${vehicle.currentKm}`);
    }

    // Handle photos
    let photoKeys = vehicle.photos as any[];
    if (photos && photos.length > 0) {
      // Upload new photos
      const newPhotoKeys: { key: string; order: number }[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const key = await this.storageService.uploadResizedImage(
          photo,
          `vehicles/${tenantId}/photos`,
          1200,
          800,
        );
        newPhotoKeys.push({ key, order: (photoKeys?.length || 0) + i });
      }
      photoKeys = [...(photoKeys || []), ...newPhotoKeys];
    }

    // Store old values for audit
    const oldValues = { ...vehicle };

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...data,
        photos: photoKeys,
        currentKm: data.currentKm ? parseInt(data.currentKm.toString()) : undefined,
        purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : undefined,
        franchiseAmount: data.franchiseAmount ? parseFloat(data.franchiseAmount) : undefined,
      },
    });

    // Audit log
    if (userId) {
      await this.auditService.log(tenantId, 'UPDATE_VEHICLE', 'Vehicle', id, userId, oldValues, updatedVehicle);
    }

    return updatedVehicle;
  }

  async remove(tenantId: string, id: string, userId?: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Check for active bookings
    const activeBookings = await this.prisma.booking.count({
      where: {
        vehicleId: id,
        status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
      },
    });

    if (activeBookings > 0) {
      throw new ForbiddenException('Cannot delete vehicle with active bookings');
    }

    // Check for future confirmed bookings
    const futureBookings = await this.prisma.booking.count({
      where: {
        vehicleId: id,
        status: 'CONFIRMED',
        startDate: { gt: new Date() },
      },
    });

    if (futureBookings > 0) {
      throw new ForbiddenException('Cannot delete vehicle with future bookings');
    }

    // Soft delete
    await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    if (userId) {
      await this.auditService.log(tenantId, 'DELETE_VEHICLE', 'Vehicle', id, userId, vehicle, null);
    }
  }

  async getPricing(tenantId: string): Promise<any[]> {
    return this.prisma.vehiclePricing.findMany({
      where: { tenantId },
      orderBy: [{ category: 'asc' }, { season: 'asc' }, { validFrom: 'desc' }],
    });
  }

  async updatePricing(tenantId: string, pricingData: VehiclePricingDto[]): Promise<void> {
    // Use a transaction to ensure all pricing updates are atomic
    await this.prisma.$transaction(async (tx) => {
      for (const pricing of pricingData) {
        // Upsert: update if same category+season+dateRange exists, otherwise create
        const existing = await tx.vehiclePricing.findFirst({
          where: {
            tenantId,
            category: pricing.category,
            season: pricing.season,
            validFrom: new Date(pricing.validFrom),
            validTo: new Date(pricing.validTo),
          },
        });

        if (existing) {
          await tx.vehiclePricing.update({
            where: { id: existing.id },
            data: { dailyPrice: parseFloat(pricing.dailyPrice) },
          });
        } else {
          await tx.vehiclePricing.create({
            data: {
              tenantId,
              category: pricing.category,
              season: pricing.season,
              dailyPrice: parseFloat(pricing.dailyPrice),
              validFrom: new Date(pricing.validFrom),
              validTo: new Date(pricing.validTo),
            },
          });
        }
      }
    });

    // Invalidate cache
    await this.cacheService.del(`vehicles:stats:${tenantId}`);
  }

  async getExpiringInsurances(tenantId: string, days: number = 30): Promise<Vehicle[]> {
    const expiryDate = addDays(new Date(), days);

    return this.prisma.vehicle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        insuranceExpiry: {
          lte: expiryDate,
          gte: new Date(),
        },
      },
      orderBy: { insuranceExpiry: 'asc' },
    });
  }

  async uploadPhotos(tenantId: string, id: string, photos: Express.Multer.File[]): Promise<Vehicle> {
    return this.update(tenantId, id, {}, undefined, photos);
  }

  async deletePhoto(tenantId: string, id: string, photoId: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const photos = (vehicle.photos as any[]) || [];
    const updatedPhotos = photos.filter(p => p.key !== photoId); // Assuming photoId is the key

    await this.prisma.vehicle.update({
      where: { id },
      data: {
        photos: updatedPhotos,
      },
    });
  }

  async getUtilizationStats(tenantId: string): Promise<any> {
    const totalVehicles = await this.prisma.vehicle.count({
      where: { tenantId, deletedAt: null },
    });

    const activeRentals = await this.prisma.booking.count({
      where: {
        tenantId,
        status: 'CHECKED_OUT',
      },
    });

    const maintenanceVehicles = await this.prisma.vehicle.count({
      where: {
        tenantId,
        status: { in: ['MAINTENANCE', 'OUT_OF_SERVICE'] },
        deletedAt: null,
      },
    });

    return {
      totalVehicles,
      activeRentals,
      maintenanceVehicles,
      utilizationRate: totalVehicles > 0 ? (activeRentals / totalVehicles) * 100 : 0,
    };
  }

  async getStatsSummary(tenantId: string, search?: string, category?: string, status?: string): Promise<any> {
    // Skip cache if filters are applied
    if (search || category || status) {
      return this.computeVehicleStats(tenantId, search, category, status);
    }
    
    return this.cacheService.getOrCompute(
      `vehicles:stats:${tenantId}`,
      async () => this.computeVehicleStats(tenantId),
      120 // 2 minutes cache
    );
  }

  private async computeVehicleStats(tenantId: string, search?: string, category?: string, status?: string): Promise<any> {
    const where: any = { tenantId, deletedAt: null };
    
    if (search) {
      where.OR = [
        { licensePlate: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [total, byStatus, byCategory] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.vehicle.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
      }),
    ]);

    const statusMap = byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

    const categoryMap = byCategory.reduce((acc, curr) => {
      acc[curr.category] = curr._count.category;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      status: statusMap,
      category: categoryMap,
    };
  }
}