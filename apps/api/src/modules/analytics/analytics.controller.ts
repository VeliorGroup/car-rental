import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class AnalyticsController {

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.analyticsService.getDashboardKpis(tenantId);
  }

  @Get('period')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get analytics for a specific period' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Period analytics retrieved successfully' })
  async getPeriodAnalytics(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.tenant.id;
    return this.analyticsService.getPeriodAnalytics(tenantId, startDate, endDate);
  }

  @Get('today-movements')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get today\'s vehicle movements (checkouts and returns)' })
  @ApiResponse({ status: 200, description: 'Today\'s movements retrieved successfully' })
  async getTodayMovements(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.analyticsService.getTodayMovements(tenantId);
  }

  @Get('vehicle-profitability')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get vehicle profitability ranking for a period' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Vehicle profitability ranking retrieved successfully' })
  async getVehicleProfitability(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.tenant.id;
    return this.analyticsService.getVehicleProfitabilityRanking(tenantId, startDate, endDate);
  }

  @Get('monthly-trend')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get monthly trend for the last 12 months' })
  @ApiResponse({ status: 200, description: 'Monthly trend data retrieved successfully' })
  async getMonthlyTrend(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.analyticsService.getMonthlyTrend(tenantId);
  }
}
