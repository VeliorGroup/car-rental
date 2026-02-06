import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PayoutStatus } from '@prisma/client';

export class PayoutFilterDto {
  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export class WalletSummaryDto {
  @ApiProperty({ description: 'Current pending balance' })
  pendingBalance: number;

  @ApiProperty({ description: 'Total paid out' })
  totalPaidOut: number;

  @ApiProperty({ description: 'Total platform fees deducted' })
  totalPlatformFees: number;

  @ApiProperty({ description: 'Total gross earnings' })
  totalGrossEarnings: number;

  @ApiProperty({ description: 'Next scheduled payout' })
  nextPayout: {
    amount: number;
    scheduledFor: Date;
  } | null;

  @ApiProperty({ description: 'Number of marketplace bookings' })
  marketplaceBookings: number;
}

export class PayoutResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PayoutStatus })
  status: PayoutStatus;

  @ApiProperty()
  scheduledFor: Date;

  @ApiProperty({ nullable: true })
  processedAt: Date | null;

  @ApiProperty({ nullable: true })
  transactionId: string | null;

  @ApiProperty()
  createdAt: Date;
}
