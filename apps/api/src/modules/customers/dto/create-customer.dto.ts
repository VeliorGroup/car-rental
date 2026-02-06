import { IsString, IsEmail, IsDateString, IsEnum, IsOptional, IsArray, ValidateNested, Matches, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerCategory, CustomerStatus } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'Phone must be a valid phone number' })
  phone: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @MaxLength(50)
  idCardNumber: string;

  @IsString()
  @MaxLength(50)
  licenseNumber: string;

  @IsDateString()
  licenseExpiry: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string = 'Albania';

  @IsEnum(CustomerCategory)
  @IsOptional()
  category?: CustomerCategory = CustomerCategory.STANDARD;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  idCardNumber?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsDateString()
  @IsOptional()
  licenseExpiry?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEnum(CustomerCategory)
  @IsOptional()
  category?: CustomerCategory;

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CustomerFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @IsEnum(CustomerCategory)
  @IsOptional()
  category?: CustomerCategory;

  @IsDateString()
  @IsOptional()
  licenseExpiryFrom?: string;

  @IsDateString()
  @IsOptional()
  licenseExpiryTo?: string;

  @IsString()
  @IsOptional()
  city?: string;

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

export class UploadDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentUploadDto)
  documents: DocumentUploadDto[];
}

export class DocumentUploadDto {
  @IsString()
  type: 'licenseFront' | 'licenseBack' | 'idCardFront' | 'idCardBack';

  @IsString()
  fileName: string;

  @IsString()
  contentType: string;
}