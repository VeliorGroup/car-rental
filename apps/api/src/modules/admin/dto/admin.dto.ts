import { IsEmail, IsString, MinLength, IsOptional, IsNumber, IsArray, IsBoolean, Min, ArrayNotEmpty } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class ResetPasswordDto {
  @IsString()
  temporaryPassword?: string;
}

export class UpdateTenantStatusDto {
  isActive?: boolean;
  planId?: string;
}

// Full Tenant Update DTO
export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Create Tenant DTO
export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  subdomain: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(6)
  adminPassword: string;

  @IsString()
  adminFirstName: string;

  @IsString()
  adminLastName: string;
}

// Create User in Tenant DTO
export class CreateTenantUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  roleId?: string;
}

// Set Trial DTO
export class SetTrialDto {
  @IsNumber()
  @Min(1)
  trialDays: number;
}

// Create Subscription Plan DTO
export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  yearlyPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  maxVehicles: number;

  @IsNumber()
  @IsOptional()
  maxUsers?: number;

  @IsNumber()
  @IsOptional()
  maxLocations?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureIds?: string[];

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// Update Subscription Plan DTO
export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  yearlyPrice?: number;

  @IsNumber()
  @IsOptional()
  maxVehicles?: number;

  @IsNumber()
  @IsOptional()
  maxUsers?: number;

  @IsNumber()
  @IsOptional()
  maxLocations?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// Feature DTOs
export class CreateFeatureDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateFeatureDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
