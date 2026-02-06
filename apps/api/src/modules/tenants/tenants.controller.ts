import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto, TenantResponseDto, CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant details' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  async getMyTenant(@Req() req: any) {
    return this.tenantsService.findOne(req.user.tenantId);
  }

  @Get('me/referrals')
  @ApiOperation({ summary: 'Get current tenant referral stats' })
  async getReferralStats(@Req() req: any) {
    return this.tenantsService.getReferralStats(req.user.tenantId);
  }

  @Post('me/referrals/regenerate')
  @ApiOperation({ summary: 'Regenerate referral code (short format DN-XXXX)' })
  async regenerateReferralCode(@Req() req: any) {
    // Relaxed check: allow any authenticated user of the tenant to generate code
    // The RolesGuard and JwtAuthGuard already ensure user belongs to tenant
    return this.tenantsService.regenerateReferralCode(req.user.tenantId);
  }

  @Put('me')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update current tenant details' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  async updateMyTenant(@Body() updateTenantDto: UpdateTenantDto, @Req() req: any) {
    return this.tenantsService.update(req.user.tenantId, updateTenantDto);
  }

  // Payment Methods
  @Get('me/payment-methods')
  @ApiOperation({ summary: 'Get all payment methods for tenant' })
  async getPaymentMethods(@Req() req: any) {
    return this.tenantsService.getPaymentMethods(req.user.tenantId);
  }

  @Post('me/payment-methods')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a new payment method' })
  async addPaymentMethod(@Body() dto: CreatePaymentMethodDto, @Req() req: any) {
    return this.tenantsService.addPaymentMethod(req.user.tenantId, dto);
  }

  @Put('me/payment-methods/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a payment method' })
  async updatePaymentMethod(@Param('id') id: string, @Body() dto: UpdatePaymentMethodDto, @Req() req: any) {
    return this.tenantsService.updatePaymentMethod(req.user.tenantId, id, dto);
  }

  @Delete('me/payment-methods/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a payment method' })
  async deletePaymentMethod(@Param('id') id: string, @Req() req: any) {
    return this.tenantsService.deletePaymentMethod(req.user.tenantId, id);
  }

  @Post('me/payment-methods/:id/default')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Set a payment method as default' })
  async setDefaultPaymentMethod(@Param('id') id: string, @Req() req: any) {
    return this.tenantsService.setDefaultPaymentMethod(req.user.tenantId, id);
  }
}
