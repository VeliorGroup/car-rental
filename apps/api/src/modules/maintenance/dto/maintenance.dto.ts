import { IsString, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceType, MaintenancePriority, MaintenanceStatus } from '@prisma/client';

export class CreateMaintenanceDto {
  @IsString()
  vehicleId: string;

  @IsString()
  title: string;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority = MaintenancePriority.MEDIUM;

  @IsString()
  @IsOptional()
  mechanicId?: string;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notes?: string[];
}

export class UpdateMaintenanceDto {
  @IsEnum(MaintenanceStatus)
  @IsOptional()
  status?: MaintenanceStatus;

  @IsString()
  @IsOptional()
  mechanicId?: string;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @IsString()
  @IsOptional()
  cost?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];
}

export class MaintenanceFilterDto {
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsEnum(MaintenanceStatus)
  @IsOptional()
  status?: MaintenanceStatus;

  @IsEnum(MaintenanceType)
  @IsOptional()
  type?: MaintenanceType;

  @IsString()
  @IsOptional()
  mechanicId?: string;

  @IsDateString()
  @IsOptional()
  scheduledFrom?: string;

  @IsDateString()
  @IsOptional()
  scheduledTo?: string;

  @IsString()
  @IsOptional()
  sortBy?: string = 'scheduledFor';

  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'asc';

  @IsString()
  @IsOptional()
  page?: string = '1';

  @IsString()
  @IsOptional()
  limit?: string = '20';
}

export class AssignMechanicDto {
  @IsString()
  mechanicId: string;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}

export class AddNoteDto {
  @IsString()
  note: string;
}

export class AddPhotoDto {
  @IsString()
  photo: string; // Base64 or URL
}