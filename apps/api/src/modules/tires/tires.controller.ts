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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TiresService } from './tires.service';
import { CreateTireDto, UpdateTireDto, StoreTireDto, TireFilterDto } from './dto/tire.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('tires')
@Controller('tires')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class TiresController {

  constructor(private readonly tiresService: TiresService) { }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Install new tire' })
  @ApiResponse({ status: 201, description: 'Tire installed successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async create(@Body() createTireDto: CreateTireDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.tiresService.create(tenantId, createTireDto, userId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'MECHANIC', 'OPERATOR')
  @ApiOperation({ summary: 'Get all tires' })
  @ApiResponse({ status: 200, description: 'Tires retrieved successfully' })
  async findAll(@Query() filters: TireFilterDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.tiresService.findAll(tenantId, filters);
  }

  @Get('alerts/wear')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Get tire wear alerts' })
  @ApiResponse({ status: 200, description: 'Wear alerts retrieved successfully' })
  async getWearAlerts(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.tiresService.getWearAlerts(tenantId);
  }

  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get tire statistics' })
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
    return this.tiresService.getStats(tenantId, startFrom, endTo, search);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC', 'OPERATOR')
  @ApiOperation({ summary: 'Get tire by ID' })
  @ApiResponse({ status: 200, description: 'Tire retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tire not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.tiresService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Update tire' })
  @ApiResponse({ status: 200, description: 'Tire updated successfully' })
  @ApiResponse({ status: 404, description: 'Tire not found' })
  async update(@Param('id') id: string, @Body() updateTireDto: UpdateTireDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.tiresService.update(tenantId, id, updateTireDto, userId);
  }

  @Post(':id/store')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Store tire in warehouse' })
  @ApiResponse({ status: 200, description: 'Tire stored successfully' })
  @ApiResponse({ status: 404, description: 'Tire not found' })
  async store(
    @Param('id') id: string,
    @Body() storeTireDto: StoreTireDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.tiresService.store(tenantId, id, storeTireDto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tire (soft delete)' })
  @ApiResponse({ status: 204, description: 'Tire deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tire not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    await this.tiresService.remove(tenantId, id, userId);
  }
}