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
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto, UpdateMaintenanceDto, MaintenanceFilterDto, AssignMechanicDto, AddNoteDto, AddPhotoDto } from './dto/maintenance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MaintenanceStatus, MaintenanceType, UserRole } from '@prisma/client';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class MaintenanceController {

  constructor(private readonly maintenanceService: MaintenanceService) { }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Schedule new maintenance' })
  @ApiResponse({ status: 201, description: 'Maintenance scheduled successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle or mechanic not found' })
  async create(@Body() createMaintenanceDto: CreateMaintenanceDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.maintenanceService.create(tenantId, createMaintenanceDto, userId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Get all maintenance records with filters' })
  @ApiResponse({ status: 200, description: 'Maintenance records retrieved successfully' })
  async findAll(@Query() filters: MaintenanceFilterDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.maintenanceService.findAll(tenantId, filters);
  }

  @Get('calendar')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Get maintenance calendar' })
  @ApiQuery({ name: 'start', required: true })
  @ApiQuery({ name: 'end', required: true })
  @ApiResponse({ status: 200, description: 'Calendar events retrieved successfully' })
  async getCalendar(
    @Query('start') start: string,
    @Query('end') end: string,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    return this.maintenanceService.getCalendar(tenantId, start, end);
  }

  @Get('mechanic/:mechanicId/workload')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get mechanic workload' })
  @ApiQuery({ name: 'start', required: true })
  @ApiQuery({ name: 'end', required: true })
  @ApiResponse({ status: 200, description: 'Workload retrieved successfully' })
  async getMechanicWorkload(
    @Param('mechanicId') mechanicId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    return this.maintenanceService.getMechanicWorkload(tenantId, mechanicId, start, end);
  }

  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get maintenance statistics' })
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
    return this.maintenanceService.getStats(tenantId, startFrom, endTo, search);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Get maintenance details' })
  @ApiResponse({ status: 200, description: 'Maintenance details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance record not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.maintenanceService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Update maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance updated successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance record not found' })
  async update(
    @Param('id') id: string,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.maintenanceService.update(tenantId, id, updateMaintenanceDto, userId);
  }

  @Put(':id/assign')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Assign mechanic' })
  @ApiResponse({ status: 200, description: 'Mechanic assigned successfully' })
  async assignMechanic(
    @Param('id') id: string,
    @Body() assignMechanicDto: AssignMechanicDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.maintenanceService.assignMechanic(tenantId, id, assignMechanicDto, userId);
  }

  @Post(':id/notes')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @ApiOperation({ summary: 'Add note' })
  @ApiResponse({ status: 201, description: 'Note added successfully' })
  async addNote(
    @Param('id') id: string,
    @Body() addNoteDto: AddNoteDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.maintenanceService.addNote(tenantId, id, addNoteDto, userId);
  }

  @Post(':id/photos')
  @Roles('ADMIN', 'MANAGER', 'MECHANIC')
  @UseInterceptors(FilesInterceptor('photos', 5))
  @ApiOperation({ summary: 'Add photos' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Photos added successfully' })
  async addPhoto(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() addPhotoDto: AddPhotoDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.maintenanceService.addPhoto(tenantId, id, addPhotoDto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete maintenance record' })
  @ApiResponse({ status: 204, description: 'Maintenance deleted successfully' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    await this.maintenanceService.remove(tenantId, id, userId);
  }
}