import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchVehiclesDto, SearchByCityDto } from './dto/search.dto';

@ApiTags('Public Search')
@Controller('public/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({ status: 200, description: 'Platform statistics' })
  async getPlatformStats() {
    return this.searchService.getPlatformStats();
  }

  @Get('top-tenants')
  @ApiOperation({ summary: 'Get top rental companies by fleet size' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Top rental companies' })
  async getTopTenants(@Query('limit') limit?: number) {
    return this.searchService.getTopTenants(limit || 5);
  }

  @Get()
  @ApiOperation({ summary: 'Search vehicles by coordinates' })
  @ApiQuery({ name: 'latitude', required: true, example: 45.4642 })
  @ApiQuery({ name: 'longitude', required: true, example: 9.19 })
  @ApiQuery({ name: 'radiusKm', required: false, example: 30 })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-02-01T10:00:00Z' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-02-05T10:00:00Z' })
  @ApiQuery({ name: 'category', required: false, enum: ['ECONOMY', 'COMPACT', 'MIDSIZE', 'FULLSIZE', 'SUV', 'LUXURY', 'VAN'] })
  @ApiResponse({ status: 200, description: 'Search results with available vehicles' })
  async searchByCoordinates(@Query() dto: SearchVehiclesDto) {
    return this.searchService.searchByCoordinates(dto);
  }

  @Get('city')
  @ApiOperation({ summary: 'Search vehicles by city name' })
  @ApiQuery({ name: 'city', required: true, example: 'Milano' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-02-01T10:00:00Z' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-02-05T10:00:00Z' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Search results with available vehicles' })
  async searchByCity(@Query() dto: SearchByCityDto) {
    return this.searchService.searchByCity(dto);
  }

  @Get('vehicles/:id')
  @ApiOperation({ summary: 'Get vehicle details' })
  @ApiResponse({ status: 200, description: 'Vehicle details with branch and tenant info' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicleDetail(@Param('id') id: string) {
    const vehicle = await this.searchService.getVehicleDetail(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  @Get('vehicles/:id/availability')
  @ApiOperation({ summary: 'Check vehicle availability for date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-02-01T10:00:00Z' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-02-05T10:00:00Z' })
  @ApiResponse({ status: 200, description: 'Availability status with booked periods' })
  async getVehicleAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.searchService.getVehicleAvailability(
      id,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
