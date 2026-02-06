import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentType {
  CONTRACT = 'contract',
  INSURANCE = 'insurance',
  REGISTRATION = 'registration',
  INSPECTION = 'inspection',
  LICENSE = 'license',
  ID_CARD = 'id_card',
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  OTHER = 'other',
}

export enum DocumentEntityType {
  VEHICLE = 'vehicle',
  CUSTOMER = 'customer',
  BOOKING = 'booking',
  TENANT = 'tenant',
}

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DocumentEntityType })
  @IsEnum(DocumentEntityType)
  entityType: DocumentEntityType;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DocumentFilterDto {
  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ enum: DocumentEntityType })
  @IsOptional()
  @IsEnum(DocumentEntityType)
  entityType?: DocumentEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({ description: 'Filter expiring documents within N days' })
  @IsOptional()
  @IsString()
  expiringWithinDays?: string;
}
