import { Controller, Get, Put, Body, UseGuards, Req, Query } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

class UpgradeSubscriptionDto {
  @IsString()
  planId: string;

  @IsString()
  @IsOptional()
  interval?: 'MONTHLY' | 'YEARLY';
}

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiQuery({ name: 'countryCode', required: false, description: 'Country code for localized pricing (e.g. AL, IT, UK)' })
  @Get('plans')
  async getPlans(@Query('countryCode') countryCode?: string) {
    return this.subscriptionService.findAllPlans(countryCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current tenant subscription' })
  @Get('current')
  async getCurrentSubscription(@Req() req: Request) {
    const tenantId = req.user!.tenantId;
    return this.subscriptionService.findOne(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upgrade or change subscription plan' })
  @Put('upgrade')
  async upgradeSubscription(@Req() req: Request, @Body() dto: UpgradeSubscriptionDto) {
    const tenantId = req.user!.tenantId;
    return this.subscriptionService.upgradePlan(tenantId, dto.planId, dto.interval);
  }
}
