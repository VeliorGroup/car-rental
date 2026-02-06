import { IsString, IsEnum, IsOptional, IsDecimal, IsDateString } from 'class-validator';
import { CautionStatus, PaymentMethod } from '@prisma/client';

export class CreateCautionDto {
  @IsString()
  bookingId: string;

  @IsDecimal()
  amount: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  payseraOrderId?: string;

  @IsString()
  @IsOptional()
  cashReceiptKey?: string;
}

export class UpdateCautionDto {
  @IsEnum(CautionStatus)
  @IsOptional()
  status?: CautionStatus;

  @IsDecimal()
  @IsOptional()
  chargedAmount?: string;

  @IsString()
  @IsOptional()
  failureReason?: string;
}

export class CautionFilterDto {
  // Filters for searching cautions
  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(CautionStatus)
  @IsOptional()
  status?: CautionStatus;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  payseraOrderId?: string;

  @IsDateString()
  @IsOptional()
  heldFrom?: string;

  @IsDateString()
  @IsOptional()
  heldTo?: string;

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

export class ReleaseCautionDto {
  @IsString()
  reason: string;
}

export class ChargeCautionDto {
  @IsDecimal()
  amount: string;

  @IsString()
  reason: string;
}