import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BookingExtraDto {
  @ApiProperty({ example: 'GPS' })
  @IsString()
  type: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  quantity: number;
}

export class CreatePublicBookingDto {
  @ApiProperty({ example: 'clxxxxx' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: '2026-02-01T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-02-05T10:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'clxxxpickup' })
  @IsOptional()
  @IsString()
  pickupBranchId?: string;

  @ApiPropertyOptional({ example: 'clxxxdropoff' })
  @IsOptional()
  @IsString()
  dropoffBranchId?: string;

  @ApiPropertyOptional({ type: [BookingExtraDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingExtraDto)
  extras?: BookingExtraDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BookingPricingResponseDto {
  @ApiProperty()
  dailyPrice: number;

  @ApiProperty()
  totalDays: number;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  extras: { type: string; quantity: number; unitPrice: number; total: number }[];

  @ApiProperty()
  extrasTotal: number;

  @ApiProperty()
  platformFee: number;

  @ApiProperty()
  tenantEarnings: number;

  @ApiProperty()
  totalAmount: number;
}

export class PublicBookingResponseDto {
  @ApiProperty()
  booking: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
    totalAmount: number;
    platformFee: number;
    vehicle: {
      brand: string;
      model: string;
    };
    pickupBranch: {
      name: string;
      address: string;
      city: string;
    } | null;
  };

  @ApiProperty()
  paymentUrl: string;
}
