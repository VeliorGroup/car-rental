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
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, VehicleFilterDto, UploadPhotosDto } from './dto/create-vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { VehicleStatus, VehicleCategory, UserRole } from '@prisma/client';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class VehiclesController {

  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  async create(@Body() createVehicleDto: CreateVehicleDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.vehiclesService.create(tenantId, createVehicleDto, userId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async findAll(@Query() filterDto: VehicleFilterDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.vehiclesService.findAll(tenantId, filterDto);
  }

  @Get('insurances/expiring')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get vehicles with expiring insurances' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async getExpiringInsurances(@Query('days') days: number = 30, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.vehiclesService.getExpiringInsurances(tenantId, Number(days));
  }

  @Get('stats/utilization')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get vehicle utilization stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getUtilizationStats(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.vehiclesService.getUtilizationStats(tenantId);
  }

  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get vehicle statistics summary' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStatsSummary(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = req.tenant.id;
    return this.vehiclesService.getStatsSummary(tenantId, search, category, status);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiResponse({ status: 200, description: 'Vehicle retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.vehiclesService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    return this.vehiclesService.update(tenantId, id, updateVehicleDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiResponse({ status: 204, description: 'Vehicle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    await this.vehiclesService.remove(tenantId, id);
  }

  @Post(':id/photos')
  @Roles('ADMIN', 'MANAGER')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiOperation({ summary: 'Upload vehicle photos' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Photos uploaded successfully' })
  async uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadPhotosDto: UploadPhotosDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    return this.vehiclesService.uploadPhotos(tenantId, id, files);
  }

  @Delete(':id/photos/:photoId')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle photo' })
  @ApiResponse({ status: 204, description: 'Photo deleted successfully' })
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    await this.vehiclesService.deletePhoto(tenantId, id, photoId);
  }
}