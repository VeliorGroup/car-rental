import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DamagesService } from './damages.service';
import { CreateDamageDto, UpdateDamageDto, DamageFilterDto, DisputeDamageDto, ResolveDisputeDto } from './dto/damage.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DamageSeverity, DamageStatus, UserRole } from '@prisma/client';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('damages')
@Controller('damages')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class DamagesController {

  constructor(private readonly damagesService: DamagesService) { }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Report new damage' })
  @ApiResponse({ status: 201, description: 'Damage reported successfully' })
  @ApiResponse({ status: 404, description: 'Booking or vehicle not found' })
  async create(@Body() createDamageDto: CreateDamageDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.damagesService.create(tenantId, createDamageDto, userId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'MECHANIC')
  @ApiOperation({ summary: 'Get all damages with filters' })
  @ApiQuery({ name: 'bookingId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: DamageSeverity })
  @ApiQuery({ name: 'status', required: false, enum: DamageStatus })
  @ApiQuery({ name: 'disputed', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Damages retrieved successfully' })
  async findAll(@Query() filters: DamageFilterDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.damagesService.findAll(tenantId, filters);
  }

  // Stats route MUST be before :id route to avoid matching 'stats' as an id
  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get damage statistics' })
  @ApiQuery({ name: 'startFrom', required: false })
  @ApiQuery({ name: 'endTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(
    @Query('startFrom') startFrom: string,
    @Query('endTo') endTo: string,
    @Query('search') search: string,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    return this.damagesService.getStats(tenantId, startFrom, endTo, search);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR', 'MECHANIC')
  @ApiOperation({ summary: 'Get damage by ID' })
  @ApiResponse({ status: 200, description: 'Damage retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Damage not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.damagesService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update damage' })
  @ApiResponse({ status: 200, description: 'Damage updated successfully' })
  @ApiResponse({ status: 404, description: 'Damage not found' })
  async update(@Param('id') id: string, @Body() updateDamageDto: UpdateDamageDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.damagesService.update(tenantId, id, updateDamageDto, userId);
  }

  @Post(':id/dispute')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Dispute a damage (customer request)' })
  @ApiResponse({ status: 200, description: 'Dispute submitted successfully' })
  @ApiResponse({ status: 404, description: 'Damage not found or not authorized' })
  @ApiResponse({ status: 400, description: 'Damage already disputed' })
  async dispute(
    @Param('id') id: string,
    @Body() disputeDto: DisputeDamageDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const customerId = req.user.id;
    return this.damagesService.dispute(tenantId, id, disputeDto, customerId);
  }

  @Post(':id/resolve-dispute')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Resolve a disputed damage' })
  @ApiResponse({ status: 200, description: 'Dispute resolved successfully' })
  @ApiResponse({ status: 404, description: 'Disputed damage not found' })
  async resolveDispute(
    @Param('id') id: string,
    @Body() resolveDto: ResolveDisputeDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.damagesService.resolveDispute(tenantId, id, resolveDto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete damage (soft delete)' })
  @ApiResponse({ status: 204, description: 'Damage deleted successfully' })
  @ApiResponse({ status: 404, description: 'Damage not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    await this.damagesService.remove(tenantId, id);
  }
}