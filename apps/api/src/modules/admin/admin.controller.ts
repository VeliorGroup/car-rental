import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminLoginDto, UpdateTenantStatusDto, UpdateTenantDto, CreateTenantDto, CreateTenantUserDto, SetTrialDto, CreatePlanDto, UpdatePlanDto, CreateFeatureDto, UpdateFeatureDto } from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============ AUTH ============
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto.email, dto.password);
  }

  // ============ STATS ============
  @Get('stats')
  @UseGuards(AdminAuthGuard)
  async getGlobalStats() {
    return this.adminService.getGlobalStats();
  }

  @Get('revenue-analytics')
  @UseGuards(AdminAuthGuard)
  async getRevenueAnalytics() {
    return this.adminService.getRevenueAnalytics();
  }

  @Get('system-stats')
  @UseGuards(AdminAuthGuard)
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  // ============ TENANTS ============
  
  @Get('subscription-plans')
  @UseGuards(AdminAuthGuard)
  async getSubscriptionPlans() {
    return this.adminService.getSubscriptionPlans();
  }

  @Get('tenants')
  @UseGuards(AdminAuthGuard)
  async getAllTenants(
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getAllTenants({ 
      status, 
      planId, 
      search, 
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Post('tenants')
  @UseGuards(AdminAuthGuard)
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.adminService.createTenant(dto);
  }

  @Get('tenants/:id')
  @UseGuards(AdminAuthGuard)
  async getTenantDetails(@Param('id') id: string) {
    return this.adminService.getTenantDetails(id);
  }

  @Patch('tenants/:id')
  @UseGuards(AdminAuthGuard)
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.adminService.updateTenant(id, dto);
  }

  @Get('tenants/:id/payments')
  @UseGuards(AdminAuthGuard)
  async getTenantPayments(@Param('id') id: string) {
    return this.adminService.getTenantPayments(id);
  }

  @Delete('tenants/:id')
  @UseGuards(AdminAuthGuard)
  async deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  @Post('tenants/:id/impersonate')
  @UseGuards(AdminAuthGuard)
  async impersonateTenant(@Param('id') id: string) {
    return this.adminService.impersonateTenant(id);
  }


  // ============ USER MANAGEMENT ============
  @Post('tenants/:tenantId/users/:userId/reset-password')
  @UseGuards(AdminAuthGuard)
  async resetUserPassword(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.resetUserPassword(tenantId, userId);
  }

  @Post('tenants/:id/users')
  @UseGuards(AdminAuthGuard)
  async createTenantUser(
    @Param('id') tenantId: string,
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.adminService.createTenantUser(tenantId, dto);
  }

  @Delete('tenants/:tenantId/users/:userId')
  @UseGuards(AdminAuthGuard)
  async deleteTenantUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.deleteTenantUser(tenantId, userId);
  }

  // ============ TRIAL MANAGEMENT ============
  @Post('tenants/:id/trial')
  @UseGuards(AdminAuthGuard)
  async setTrial(
    @Param('id') tenantId: string,
    @Body() dto: SetTrialDto,
  ) {
    return this.adminService.setTrial(tenantId, dto.trialDays);
  }


  // ============ REFERRALS ============
  @Get('referrals')
  @UseGuards(AdminAuthGuard)
  async getAllReferrals(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getAllReferrals(
      limit ? parseInt(limit) : 100,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('referrals/stats')
  @UseGuards(AdminAuthGuard)
  async getReferralStats() {
    return this.adminService.getReferralStats();
  }

  // ============ ACTIVITY LOGS ============
  @Get('activity-logs')
  @UseGuards(AdminAuthGuard)
  async getGlobalActivityLogs(@Query('limit') limit?: string) {
    return this.adminService.getGlobalActivityLogs(limit ? parseInt(limit) : 100);
  }

  @Get('tenants/:id/activity-logs')
  @UseGuards(AdminAuthGuard)
  async getTenantActivityLogs(
    @Param('id') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getTenantActivityLogs(tenantId, limit ? parseInt(limit) : 100);
  }

  // ============ SUBSCRIPTIONS ============

  @Post('tenants/:id/subscription/activate')
  @UseGuards(AdminAuthGuard)
  async activateSubscription(
    @Param('id') tenantId: string,
    @Body() body: { planId: string; durationMonths?: number; paymentMethod?: string },
  ) {
    return this.adminService.activateSubscription(
      tenantId,
      body.planId,
      body.durationMonths,
      body.paymentMethod,
    );
  }

  @Patch('tenants/:id/subscription/plan')
  @UseGuards(AdminAuthGuard)
  async changePlan(
    @Param('id') tenantId: string,
    @Body() body: { planId: string },
  ) {
    return this.adminService.changePlan(tenantId, body.planId);
  }

  @Post('tenants/:id/subscription/suspend')
  @UseGuards(AdminAuthGuard)
  async suspendSubscription(
    @Param('id') tenantId: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.suspendSubscription(tenantId, body.reason);
  }

  @Post('tenants/:id/subscription/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelSubscription(
    @Param('id') tenantId: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.cancelSubscription(tenantId, body.reason);
  }

  @Post('tenants/:id/subscription/reactivate')
  @UseGuards(AdminAuthGuard)
  async reactivateSubscription(
    @Param('id') tenantId: string,
    @Body() body: { extensionDays?: number },
  ) {
    return this.adminService.reactivateSubscription(tenantId, body.extensionDays || 0);
  }

  @Post('tenants/:id/payments')
  @UseGuards(AdminAuthGuard)
  async addPayment(
    @Param('id') tenantId: string,
    @Body() body: { amount: number; paymentMethod: string; notes?: string },
  ) {
    return this.adminService.addPayment(tenantId, body.amount, body.paymentMethod, body.notes);
  }

  @Patch('payments/:paymentId')
  @UseGuards(AdminAuthGuard)
  async updatePaymentStatus(
    @Param('paymentId') paymentId: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updatePaymentStatus(paymentId, body.status);
  }


  @Patch('tenants/:id/subscription')
  @UseGuards(AdminAuthGuard)
  async updateSubscriptionStatus(
    @Param('id') tenantId: string,
    @Body() body: { status: string; endDate?: string },
  ) {
    return this.adminService.updateSubscriptionStatus(
      tenantId, 
      body.status, 
      body.endDate ? new Date(body.endDate) : undefined
    );
  }

  // ============ PLAN MANAGEMENT ============

  @Get('plans')
  @UseGuards(AdminAuthGuard)
  async getAllPlans() {
    return this.adminService.getAllPlans();
  }

  @Post('plans')
  @UseGuards(AdminAuthGuard)
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  @UseGuards(AdminAuthGuard)
  async updatePlan(@Param('id') planId: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(planId, dto);
  }

  @Delete('plans/:id')
  @UseGuards(AdminAuthGuard)
  async deletePlan(@Param('id') planId: string) {
    return this.adminService.deletePlan(planId);
  }

  @Put('plans/:id/pricing')
  @UseGuards(AdminAuthGuard)
  async setPlanPricing(
    @Param('id') planId: string,
    @Body() dto: { pricing: Array<{ country: string; currency: string; price: number; yearlyPrice: number }> },
  ) {
    return this.adminService.setPlanPricing(planId, dto.pricing);
  }

  @Get('plans/:id/pricing')
  @UseGuards(AdminAuthGuard)
  async getPlanPricing(@Param('id') planId: string) {
    return this.adminService.getPlanPricing(planId);
  }

  // ============ FEATURES ============
  
  @Get('features')
  @UseGuards(AdminAuthGuard)
  async getFeatures() {
    return this.adminService.getFeatures();
  }

  @Post('features')
  @UseGuards(AdminAuthGuard)
  async createFeature(@Body() dto: CreateFeatureDto) {
    return this.adminService.createFeature(dto);
  }

  @Patch('features/:id')
  @UseGuards(AdminAuthGuard)
  async updateFeature(@Param('id') featureId: string, @Body() dto: UpdateFeatureDto) {
    return this.adminService.updateFeature(featureId, dto);
  }

  @Delete('features/:id')
  @UseGuards(AdminAuthGuard)
  async deleteFeature(@Param('id') featureId: string) {
    return this.adminService.deleteFeature(featureId);
  }

  // ==================== ROLES ====================

  @Get('roles')
  @UseGuards(AdminAuthGuard)
  async getRoles() {
    return this.adminService.getRoles();
  }

  @Post('roles')
  @UseGuards(AdminAuthGuard)
  async createRole(@Body() body: { name: string; description?: string; permissions?: string[] }) {
    return this.adminService.createRole(body);
  }

  @Patch('roles/:id')
  @UseGuards(AdminAuthGuard)
  async updateRole(
    @Param('id') roleId: string,
    @Body() body: { name?: string; description?: string; permissions?: string[] }
  ) {
    return this.adminService.updateRole(roleId, body);
  }

  @Delete('roles/:id')
  @UseGuards(AdminAuthGuard)
  async deleteRole(@Param('id') roleId: string) {
    return this.adminService.deleteRole(roleId);
  }
}
