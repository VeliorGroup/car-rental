import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  planId: string;

  @IsString()
  tenantId: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;
}

export class UpdateSubscriptionDto {
  @IsString()
  @IsOptional()
  planId?: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;
}
