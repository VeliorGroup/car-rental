import { IsString, IsInt, IsEnum, IsOptional, IsDecimal, IsArray, IsDateString, Min, Max, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleCategory, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9\- ]{2,20}$/i, { message: 'License plate must contain only letters, numbers, hyphens and spaces (2-20 chars)' })
  licensePlate: string;

  @IsString()
  @MaxLength(50)
  brand: string;

  @IsString()
  @MaxLength(50)
  model: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @IsString()
  @IsOptional()
  color?: string;

  @IsDateString()
  insuranceExpiry: string;

  @IsDateString()
  purchaseDate: string;

  @IsDateString()
  reviewDate: string;

  @IsInt()
  @Min(0)
  currentKm: number;

  @IsDecimal()
  @IsOptional()
  purchasePrice?: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus = VehicleStatus.AVAILABLE;

  @IsString()
  @IsOptional()
  location?: string = 'Tirana';

  @IsDecimal()
  @IsOptional()
  franchiseAmount?: string = '500';

  @IsString()
  @IsOptional()
  fuelType?: string = 'Diesel';

  @IsString()
  @IsOptional()
  transmission?: string = 'Manual';

  @IsInt()
  @Min(1)
  @IsOptional()
  seatCount?: number = 5;

  @IsInt()
  @Min(2)
  @Max(6)
  @IsOptional()
  doorCount?: number = 4;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[] = [];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  licensePlate?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  @IsOptional()
  year?: number;

  @IsEnum(VehicleCategory)
  @IsOptional()
  category?: VehicleCategory;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  vin?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  currentKm?: number;

  @IsDecimal()
  @IsOptional()
  purchasePrice?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  insuranceExpiry?: string;

  @IsDateString()
  @IsOptional()
  reviewDate?: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDecimal()
  @IsOptional()
  franchiseAmount?: string;

  @IsString()
  @IsOptional()
  fuelType?: string;

  @IsString()
  @IsOptional()
  transmission?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  seatCount?: number;

  @IsInt()
  @Min(2)
  @Max(6)
  @IsOptional()
  doorCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class VehicleFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(VehicleCategory)
  @IsOptional()
  category?: VehicleCategory;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsInt()
  @Min(1900)
  @IsOptional()
  yearFrom?: number;

  @IsInt()
  @Min(1900)
  @IsOptional()
  yearTo?: number;

  @IsDateString()
  @IsOptional()
  insuranceExpiryBefore?: string;

  @IsDateString()
  @IsOptional()
  reviewDateBefore?: string;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';

  @IsString()
  @IsOptional()
  page?: string = '1';

  @IsString()
  @IsOptional()
  limit?: string = '20';

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class VehiclePricingDto {
  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @IsString()
  season: string; // HIGH, LOW, MEDIUM

  @IsDecimal()
  dailyPrice: string;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validTo: string;
}

export class PriceOverrideDto {
  @IsDecimal()
  newPrice: string;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  details?: string;
}

export class UploadPhotosDto {
  @IsArray()
  @Type(() => PhotoUploadDto)
  photos: PhotoUploadDto[];
}

export class PhotoUploadDto {
  @IsString()
  fileName: string;

  @IsString()
  contentType: string;

  @IsInt()
  @IsOptional()
  order?: number;
}