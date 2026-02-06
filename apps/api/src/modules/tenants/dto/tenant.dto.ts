import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class TenantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  subdomain: string;

  @ApiProperty()
  companyName: string | null;

  @ApiProperty()
  vatNumber: string | null;

  @ApiProperty()
  address: string | null;

  @ApiProperty()
  city: string | null;

  @ApiProperty()
  country: string;

  @ApiProperty()
  phone: string | null;
}

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Card type (Visa, Mastercard, etc.)' })
  @IsString()
  cardType: string;

  @ApiProperty({ description: 'Last 4 digits of card number' })
  @IsString()
  last4: string;

  @ApiProperty({ description: 'Expiry month (1-12)' })
  @IsNumber()
  @Min(1)
  @Max(12)
  expiryMonth: number;

  @ApiProperty({ description: 'Expiry year (e.g., 2025)' })
  @IsNumber()
  @Min(2024)
  expiryYear: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdatePaymentMethodDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
