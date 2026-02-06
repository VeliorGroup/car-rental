import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { SearchVehiclesDto, SearchByCityDto, SearchResult } from './dto/search.dto';
import { VehicleStatus } from '@prisma/client';
import { differenceInDays } from 'date-fns';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  // City coordinates mapping (can be extended or replaced with geocoding API)
  private readonly cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'milano': { lat: 45.4642, lng: 9.1900 },
    'roma': { lat: 41.9028, lng: 12.4964 },
    'torino': { lat: 45.0703, lng: 7.6869 },
    'napoli': { lat: 40.8518, lng: 14.2681 },
    'firenze': { lat: 43.7696, lng: 11.2558 },
    'bologna': { lat: 44.4949, lng: 11.3426 },
    'venezia': { lat: 45.4408, lng: 12.3155 },
    'palermo': { lat: 38.1157, lng: 13.3615 },
    'genova': { lat: 44.4056, lng: 8.9463 },
    'bari': { lat: 41.1171, lng: 16.8719 },
    'tirana': { lat: 41.3275, lng: 19.8187 },
    'durres': { lat: 41.3246, lng: 19.4565 },
    'vlora': { lat: 40.4667, lng: 19.4897 },
    'shkoder': { lat: 42.0683, lng: 19.5126 },
  };

  constructor(
    private prisma: PrismaService,
    private cacheService: RedisCacheService,
  ) {}

  async getPlatformStats() {
    const cacheKey = 'platform:stats';
    
    return this.cacheService.getOrCompute(
      cacheKey,
      async () => {
        const [
          totalVehicles,
          totalTenants,
          totalBookings,
          availableVehicles,
        ] = await Promise.all([
          this.prisma.vehicle.count({
            where: { deletedAt: null },
          }),
          this.prisma.tenant.count({
            where: { isActive: true },
          }),
          this.prisma.booking.count({
            where: { deletedAt: null },
          }),
          this.prisma.vehicle.count({
            where: { 
              deletedAt: null,
              status: VehicleStatus.AVAILABLE,
              tenant: { isActive: true },
            },
          }),
        ]);

        return {
          totalVehicles,
          totalTenants,
          totalBookings,
          availableVehicles,
        };
      },
      300, // Cache for 5 minutes
    );
  }

  async getTopTenants(limit: number = 5) {
    const cacheKey = `platform:top-tenants:${limit}`;
    
    return this.cacheService.getOrCompute(
      cacheKey,
      async () => {
        // Get tenants with vehicle count
        const tenantsWithVehicleCount = await this.prisma.tenant.findMany({
          where: { 
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            companyName: true,
            _count: {
              select: {
                vehicles: {
                  where: { deletedAt: null }
                }
              }
            }
          },
          orderBy: {
            vehicles: {
              _count: 'desc'
            }
          },
          take: limit,
        });

        return tenantsWithVehicleCount
          .filter(t => t._count.vehicles > 0)
          .map(t => ({
            id: t.id,
            name: t.companyName || t.name,
            vehicleCount: t._count.vehicles,
          }));
      },
      300, // Cache for 5 minutes
    );
  }

  async searchByCoordinates(dto: SearchVehiclesDto): Promise<{
    results: SearchResult[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { latitude, longitude, radiusKm = 30, startDate, endDate, category, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    // 1. Find branches within radius
    const branches = await this.findBranchesNearLocation(latitude, longitude, radiusKm);
    
    if (branches.length === 0) {
      return { results: [], total: 0, page, limit };
    }

    const branchIds = branches.map(b => b.id);
    const branchMap = new Map(branches.map(b => [b.id, b]));

    // 2. Find available vehicles at those branches
    const whereClause: any = {
      branchId: { in: branchIds },
      status: VehicleStatus.AVAILABLE,
      deletedAt: null,
      tenant: {
        isActive: true,
      },
    };

    if (category) {
      whereClause.category = category;
    }

    // 3. Get vehicles
    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: whereClause,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where: whereClause }),
    ]);

    // 4. Filter by availability (no overlapping bookings)
    const availableVehicles = await this.filterByAvailability(
      vehicles,
      new Date(startDate),
      new Date(endDate),
    );

    // 5. Calculate pricing and build results
    const days = differenceInDays(new Date(endDate), new Date(startDate)) || 1;

    const results: SearchResult[] = await Promise.all(
      availableVehicles.map(async (vehicle) => {
        const branchData = branchMap.get(vehicle.branchId!);
        const dailyPrice = await this.getVehicleDailyPrice(vehicle.tenantId, vehicle.category);

        return {
          vehicle: {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            category: vehicle.category,
            fuelType: vehicle.fuelType,
            transmission: vehicle.transmission,
            seatCount: vehicle.seatCount,
            photos: vehicle.photos,
          },
          branch: {
            id: vehicle.branch?.id || '',
            name: vehicle.branch?.name || '',
            city: vehicle.branch?.city || '',
            address: vehicle.branch?.address || '',
            distance: branchData?.distance || 0,
          },
          tenant: {
            id: vehicle.tenant.id,
            name: vehicle.tenant.name,
            companyName: vehicle.tenant.companyName,
          },
          pricing: {
            dailyPrice,
            totalDays: days,
            totalPrice: dailyPrice * days,
          },
        };
      }),
    );

    // Sort by distance
    results.sort((a, b) => a.branch.distance - b.branch.distance);

    return { results, total, page, limit };
  }

  async searchByCity(dto: SearchByCityDto): Promise<{
    results: SearchResult[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cityNormalized = dto.city.toLowerCase().trim();
    const coords = this.cityCoordinates[cityNormalized];

    if (!coords) {
      // Fallback: search by city name directly in branches
      return this.searchByCityName(dto);
    }

    return this.searchByCoordinates({
      latitude: coords.lat,
      longitude: coords.lng,
      radiusKm: 50,
      startDate: dto.startDate,
      endDate: dto.endDate,
      category: dto.category,
      page: dto.page,
      limit: dto.limit,
    });
  }

  async getVehicleDetail(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            phone: true,
            openingHours: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!vehicle || vehicle.deletedAt) {
      return null;
    }

    return vehicle;
  }

  async getVehicleAvailability(vehicleId: string, startDate: Date, endDate: Date) {
    // Get all bookings for this vehicle in the date range
    const bookings = await this.prisma.booking.findMany({
      where: {
        vehicleId,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    // Get maintenance schedules
    const maintenances = await this.prisma.maintenance.findMany({
      where: {
        vehicleId,
        status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] },
        scheduledFor: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        scheduledFor: true,
        completedAt: true,
      },
    });

    return {
      vehicleId,
      bookedPeriods: bookings,
      maintenancePeriods: maintenances,
      isAvailable: bookings.length === 0 && maintenances.length === 0,
    };
  }

  private async findBranchesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<Array<{ id: string; distance: number }>> {
    // Haversine formula for distance calculation
    // Using raw SQL for efficient geospatial query
    const branches = await this.prisma.$queryRaw<
      Array<{ id: string; distance: number }>
    >`
      SELECT 
        id,
        (6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) 
          * cos(radians(longitude) - radians(${longitude})) 
          + sin(radians(${latitude})) * sin(radians(latitude))
        )) AS distance
      FROM branches
      WHERE 
        "isActive" = true 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) 
          * cos(radians(longitude) - radians(${longitude})) 
          + sin(radians(${latitude})) * sin(radians(latitude))
        )) < ${radiusKm}
      ORDER BY distance
    `;

    return branches;
  }

  private async searchByCityName(dto: SearchByCityDto): Promise<{
    results: SearchResult[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { city, startDate, endDate, category, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      branch: {
        city: { contains: city, mode: 'insensitive' },
        isActive: true,
      },
      status: VehicleStatus.AVAILABLE,
      deletedAt: null,
      tenant: {
        isActive: true,
      },
    };

    if (category) {
      whereClause.category = category;
    }

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: whereClause,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where: whereClause }),
    ]);

    const availableVehicles = await this.filterByAvailability(
      vehicles,
      new Date(startDate),
      new Date(endDate),
    );

    const days = differenceInDays(new Date(endDate), new Date(startDate)) || 1;

    const results: SearchResult[] = await Promise.all(
      availableVehicles.map(async (vehicle) => {
        const dailyPrice = await this.getVehicleDailyPrice(vehicle.tenantId, vehicle.category);

        return {
          vehicle: {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            category: vehicle.category,
            fuelType: vehicle.fuelType,
            transmission: vehicle.transmission,
            seatCount: vehicle.seatCount,
            photos: vehicle.photos,
          },
          branch: {
            id: vehicle.branch?.id || '',
            name: vehicle.branch?.name || '',
            city: vehicle.branch?.city || '',
            address: vehicle.branch?.address || '',
            distance: 0,
          },
          tenant: {
            id: vehicle.tenant.id,
            name: vehicle.tenant.name,
            companyName: vehicle.tenant.companyName,
          },
          pricing: {
            dailyPrice,
            totalDays: days,
            totalPrice: dailyPrice * days,
          },
        };
      }),
    );

    return { results, total, page, limit };
  }

  private async filterByAvailability(
    vehicles: any[],
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const vehicleIds = vehicles.map(v => v.id);

    // Find vehicles with overlapping bookings
    const bookedVehicleIds = await this.prisma.booking.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        deletedAt: null,
        status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
      select: { vehicleId: true },
    });

    const bookedSet = new Set(bookedVehicleIds.map(b => b.vehicleId));

    // Find vehicles under maintenance
    const maintenanceVehicleIds = await this.prisma.maintenance.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] },
        scheduledFor: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { vehicleId: true },
    });

    const maintenanceSet = new Set(maintenanceVehicleIds.map(m => m.vehicleId));

    return vehicles.filter(
      v => !bookedSet.has(v.id) && !maintenanceSet.has(v.id),
    );
  }

  private async getVehicleDailyPrice(
    tenantId: string,
    category: string,
  ): Promise<number> {
    // Try to get from cache
    const cacheKey = `pricing:${tenantId}:${category}`;
    
    return this.cacheService.getOrCompute(
      cacheKey,
      async () => {
        const now = new Date();
        const pricing = await this.prisma.vehiclePricing.findFirst({
          where: {
            tenantId,
            category: category as any,
            validFrom: { lte: now },
            validTo: { gte: now },
          },
          orderBy: { createdAt: 'desc' },
        });

        return pricing ? pricing.dailyPrice.toNumber() : 50; // Default price
      },
      300, // Cache for 5 minutes
    );
  }
}
