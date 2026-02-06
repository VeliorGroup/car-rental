import { IsString, IsNumber, IsEnum, IsOptional, IsUrl, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { PaymentType } from '@prisma/client';

export class CreatePaymentDto {
    @ApiProperty({ example: 'booking-123' })
    @IsString()
    bookingId: string;

    @ApiProperty({ example: 100.50 })
    @IsNumber()
    @Min(0.01, { message: 'Amount must be greater than 0' })
    amount: number;

    @ApiProperty({ enum: PaymentType })
    @IsEnum(PaymentType)
    type: PaymentType;

    @ApiProperty({ example: 'Payment for booking #123' })
    @IsString()
    @MaxLength(500)
    description: string;
}

export class PayseraCallbackDto {
    @IsString()
    data: string;

    @IsString()
    ss1: string;

    @IsString()
    ss2: string;
}
