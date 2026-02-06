import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { VehicleCategory } from '@prisma/client';

export class DashboardKpiDto {
  totalVehicles: number;
  availableVehicles: number;
  activeBookings: number;
  todayRevenue: number;
  totalRevenue: number;
  openMaintenance: number;
  cautionsToRelease: number;
  pendingDamages: number;
  expiringLicenses: number;
  expiringInsurances: number;
}

export class TcoQueryDto {
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}

export class ProfitReportQueryDto {
  @IsEnum(VehicleCategory)
  @IsOptional()
  category?: VehicleCategory;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  format?: 'json' | 'excel' = 'json';
}

export class VehicleMetricsDto {
  vehicleId: string;
  licensePlate: string;
  totalBookings: number;
  totalRevenue: number;
  totalMaintenanceCost: number;
  totalDamageCost: number;
  tco: number;
  profit: number;
  roi: number;
  utilizationRate: number;
}

export class MonthlyMetricsDto {
  month: string;
  bookings: number;
  revenue: number;
  maintenanceCost: number;
  damageCost: number;
  profit: number;
}

export class TireMetricsDto {
  tireId: string;
  position: string;
  brand: string;
  size: string;
  mountKm: number;
  currentKm: number;
  wearKm: number;
  remainingKm: number;
  replacementNeeded: boolean;
}