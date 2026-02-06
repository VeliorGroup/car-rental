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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FuelLogsService } from './fuel-logs.service';
import { CreateFuelLogDto, UpdateFuelLogDto, FuelLogFilterDto } from './dto/fuel-logs.dto';

@ApiTags('fuel-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fuel-logs')
export class FuelLogsController {
  constructor(private readonly fuelLogsService: FuelLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fuel log' })
  async create(@Req() req: any, @Body() data: CreateFuelLogDto) {
    return this.fuelLogsService.create(req.user.tenantId, data, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fuel logs' })
  async findAll(@Req() req: any, @Query() filters: FuelLogFilterDto) {
    return this.fuelLogsService.findAll(req.user.tenantId, filters);
  }

  @Get('stats/fleet')
  @ApiOperation({ summary: 'Get fleet-wide fuel statistics' })
  async getFleetStats(@Req() req: any) {
    return this.fuelLogsService.getFleetStats(req.user.tenantId);
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Get fuel logs for a specific vehicle' })
  async findByVehicle(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @Query() filters: FuelLogFilterDto,
  ) {
    return this.fuelLogsService.findByVehicle(req.user.tenantId, vehicleId, filters);
  }

  @Get('vehicle/:vehicleId/stats')
  @ApiOperation({ summary: 'Get fuel statistics for a vehicle' })
  async getVehicleStats(@Req() req: any, @Param('vehicleId') vehicleId: string) {
    return this.fuelLogsService.getVehicleStats(req.user.tenantId, vehicleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fuel log by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.fuelLogsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update fuel log' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateFuelLogDto,
  ) {
    return this.fuelLogsService.update(req.user.tenantId, id, data, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete fuel log' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.fuelLogsService.remove(req.user.tenantId, id, req.user.id);
  }
}
