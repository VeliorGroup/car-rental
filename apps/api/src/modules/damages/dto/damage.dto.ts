import { IsString, IsEnum, IsOptional, IsDecimal, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { DamageSeverity, DamageStatus } from '@prisma/client';

export class CreateDamageDto {
  @IsString()
  bookingId: string;

  @IsString()
  vehicleId: string;

  @IsEnum(DamageSeverity)
  severity: DamageSeverity;

  @IsString()
  type: string; // Scratch, Dent, Broken, etc.

  @IsString()
  position: string; // Front, Rear, Left, Right, etc.

  @IsString()
  description: string;

  @IsDecimal()
  estimatedCost: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[]; // Presigned URLs

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDamageDto {
  @IsEnum(DamageStatus)
  @IsOptional()
  status?: DamageStatus;

  @IsDecimal()
  @IsOptional()
  actualCost?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  disputed?: boolean;

  @IsString()
  @IsOptional()
  disputeReason?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  disputePhotos?: string[];
}

export class DamageFilterDto {
  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(DamageSeverity)
  @IsOptional()
  severity?: DamageSeverity;

  @IsEnum(DamageStatus)
  @IsOptional()
  status?: DamageStatus;

  @IsBoolean()
  @IsOptional()
  disputed?: boolean;

  @IsString()
  @IsOptional()
  startFrom?: string;

  @IsString()
  @IsOptional()
  endTo?: string;

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
}

export class DisputeDamageDto {
  @IsString()
  reason: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];
}

export class ResolveDisputeDto {
  @IsBoolean()
  approved: boolean; // true=approve damage, false=refund customer

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDecimal()
  @IsOptional()
  refundAmount?: string;
}