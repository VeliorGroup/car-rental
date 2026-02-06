import { IsString, IsDateString, IsArray, ValidateNested, IsOptional, IsInt, Min, Max, IsDecimal, IsEnum, IsNumber, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus, CancellationReason } from '@prisma/client';

// Custom validator: endDate must be after startDate
@ValidatorConstraint({ name: 'isAfterStartDate', async: false })
class IsAfterStartDate implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const obj = args.object as any;
    if (!obj.startDate || !endDate) return true;
    return new Date(endDate) > new Date(obj.startDate);
  }

  defaultMessage() {
    return 'endDate must be after startDate';
  }
}

export class CreateBookingDto {
  @IsString()
  customerId: string;

  @IsString()
  vehicleId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @Validate(IsAfterStartDate)
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraItemDto)
  @IsOptional()
  extras?: ExtraItemDto[] = [];

  @IsDecimal()
  @IsOptional()
  depositAmount?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cautionAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPrice?: number;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}

export class ExtraItemDto {
  @IsString()
  type: string; // GPS, CHILD_SEAT, ADDITIONAL_DRIVER, etc.

  @IsInt()
  @Min(1)
  quantity: number;

  @IsDecimal()
  @IsOptional()
  price?: string; // Optional, will be calculated from config if not provided
}

export class UpdateBookingDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraItemDto)
  @IsOptional()
  extras?: ExtraItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BookingFilterDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @IsDateString()
  @IsOptional()
  startFrom?: string;

  @IsDateString()
  @IsOptional()
  startTo?: string;

  @IsDateString()
  @IsOptional()
  endFrom?: string;

  @IsDateString()
  @IsOptional()
  endTo?: string;

  @IsString()
  @IsOptional()
  sortBy?: string = 'startDate';

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

export class CheckoutDto {
  @IsInt()
  @Min(0)
  km: number;

  @IsInt()
  @Min(0)
  @Max(100)
  fuelLevel: number;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;

  @IsEnum(['CASH', 'PAYSERA', 'STRIPE'])
  @IsOptional()
  paymentMethod?: 'CASH' | 'PAYSERA' | 'STRIPE' = 'CASH';

  @IsString()
  @IsOptional()
  payseraOrderId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  signature?: string;
}

export class CheckinDto {
  @IsInt()
  km: number;

  @IsInt()
  @Min(0)
  @Max(100)
  fuelLevel: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DamageReportDto)
  @IsOptional()
  newDamages?: DamageReportDto[] = [];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  signature?: string;
}

export class DamageReportDto {
  @IsString()
  type: string;

  @IsString()
  position: string;

  @IsString()
  description: string;

  @IsDecimal()
  estimatedCost: string;

  @IsEnum(['SCRATCH', 'DENT', 'BROKEN_GLASS', 'MISSING_PART', 'OTHER'])
  severity: 'SCRATCH' | 'DENT' | 'BROKEN_GLASS' | 'MISSING_PART' | 'OTHER';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[]; // Presigned upload URLs
}

export class CancelBookingDto {
  @IsEnum(CancellationReason)
  reason: CancellationReason;

  @IsString()
  @IsOptional()
  details?: string;
}

export class CalculatePriceDto {
  @IsString()
  customerId: string;

  @IsString()
  vehicleId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @Validate(IsAfterStartDate)
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraItemDto)
  @IsOptional()
  extras?: ExtraItemDto[] = [];
}