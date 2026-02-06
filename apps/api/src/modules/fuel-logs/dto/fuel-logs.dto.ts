import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FuelType {
  PETROL = 'petrol',
  DIESEL = 'diesel',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
  LPG = 'lpg',
}

export class CreateFuelLogDto {
  @ApiProperty()
  @IsString()
  vehicleId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuelType: FuelType;

  @ApiProperty()
  @IsNumber()
  liters: number;

  @ApiProperty()
  @IsNumber()
  costPerLiter: number;

  @ApiProperty()
  @IsNumber()
  totalCost: number;

  @ApiProperty()
  @IsNumber()
  odometerReading: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  filledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Receipt image URL' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Was tank filled to full?' })
  @IsOptional()
  fullTank?: boolean;
}

export class UpdateFuelLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  liters?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPerLiter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  odometerReading?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  fullTank?: boolean;
}

export class FuelLogFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
