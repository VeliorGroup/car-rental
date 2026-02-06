import { IsString, IsOptional, IsInt, IsDecimal, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTireDto {
  @IsString()
  vehicleId: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsString()
  size: string; // e.g., "205/55R16"

  @IsString()
  position: string; // FL, FR, RL, RR, SPARE

  @IsDateString()
  mountDate: string;

  @IsInt()
  mountKm: number;

  @IsDecimal()
  cost: string;

  @IsString()
  @IsOptional()
  season?: string; // SUMMER, WINTER, ALL_SEASON

  @IsString()
  @IsOptional()
  location?: string; // Vehicle position or warehouse location

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTireDto {
  @IsInt()
  @IsOptional()
  mountKm?: number;

  @IsInt()
  @IsOptional()
  currentKm?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class StoreTireDto {
  @IsString()
  location: string; // Warehouse location

  @IsString()
  @IsOptional()
  season?: string;
}

export class TireFilterDto {
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  season?: string;

  @IsString()
  @IsOptional()
  sortBy?: string = 'mountDate';

  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';

  @IsString()
  @IsOptional()
  page?: string = '1';

  @IsString()
  @IsOptional()
  limit?: string = '20';
}