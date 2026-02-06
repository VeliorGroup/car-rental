import { IsString, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  BOOKINGS = 'bookings',
  VEHICLES = 'vehicles',
  CUSTOMERS = 'customers',
  REVENUE = 'revenue',
  MAINTENANCE = 'maintenance',
  DAMAGES = 'damages',
  CAUTIONS = 'cautions',
  FLEET_UTILIZATION = 'fleet_utilization',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class GenerateReportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

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
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  columns?: string[];
}

export class ReportFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}

export class ScheduledReportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({ description: 'Cron expression for scheduling' })
  @IsString()
  schedule: string; // e.g., '0 8 * * 1' for every Monday at 8am

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}
