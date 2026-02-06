import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionRequiredGuard } from './guards/subscription-required.guard';
import { PlanLimitGuard } from './guards/plan-limit.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PrismaService, SubscriptionRequiredGuard, PlanLimitGuard],
  exports: [SubscriptionService, SubscriptionRequiredGuard, PlanLimitGuard],
})
export class SubscriptionModule {}
