import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VehicleCategory } from '@prisma/client';

export class SearchVehiclesDto {
  @ApiProperty({ example: 45.4642 })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 9.1900 })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ example: 50, default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  radiusKm?: number = 30;

  @ApiProperty({ example: '2026-02-01T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-02-05T10:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: VehicleCategory })
  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class SearchByCityDto {
  @ApiProperty({ example: 'Milano' })
  @IsString()
  city: string;

  @ApiProperty({ example: '2026-02-01T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-02-05T10:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: VehicleCategory })
  @IsOptional()
  @IsEnum(VehicleCategory)
  category?: VehicleCategory;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export interface SearchResult {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    category: string;
    fuelType: string;
    transmission: string;
    seatCount: number;
    photos: any;
  };
  branch: {
    id: string;
    name: string;
    city: string;
    address: string;
    distance: number;
  };
  tenant: {
    id: string;
    name: string;
    companyName: string | null;
  };
  pricing: {
    dailyPrice: number;
    totalDays: number;
    totalPrice: number;
  };
}
