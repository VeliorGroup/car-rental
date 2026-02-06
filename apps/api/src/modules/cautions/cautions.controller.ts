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
import { CautionsService } from './cautions.service';
import { CreateCautionDto, UpdateCautionDto, CautionFilterDto, ReleaseCautionDto, ChargeCautionDto } from './dto/caution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CautionStatus, PaymentMethod, UserRole } from '@prisma/client';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('cautions')
@Controller('cautions')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class CautionsController {

  constructor(private readonly cautionsService: CautionsService) { }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Get all cautions with filters' })
  @ApiQuery({ name: 'bookingId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: CautionStatus })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'payseraOrderId', required: false })
  @ApiQuery({ name: 'heldFrom', required: false })
  @ApiQuery({ name: 'heldTo', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Cautions retrieved successfully' })
  async findAll(@Query() filters: CautionFilterDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.cautionsService.findAll(tenantId, filters);
  }

  // Stats route MUST be before :id route to avoid matching 'stats' as an id
  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get caution statistics' })
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
    return this.cautionsService.getStats(tenantId, startFrom, endTo, search);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Get caution by ID' })
  @ApiResponse({ status: 200, description: 'Caution retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Caution not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.cautionsService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update caution' })
  @ApiResponse({ status: 200, description: 'Caution updated successfully' })
  @ApiResponse({ status: 404, description: 'Caution not found' })
  async update(@Param('id') id: string, @Body() updateCautionDto: UpdateCautionDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.cautionsService.update(tenantId, id, updateCautionDto, userId);
  }

  @Post(':id/release')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Release caution' })
  @ApiResponse({ status: 200, description: 'Caution released successfully' })
  @ApiResponse({ status: 404, description: 'Caution not found' })
  async release(
    @Param('id') id: string,
    @Body() releaseDto: ReleaseCautionDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.cautionsService.release(tenantId, id, releaseDto, userId);
  }

  @Post(':id/charge')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Charge caution' })
  @ApiResponse({ status: 200, description: 'Caution charged successfully' })
  @ApiResponse({ status: 404, description: 'Caution not found' })
  async charge(
    @Param('id') id: string,
    @Body() chargeDto: ChargeCautionDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    return this.cautionsService.charge(tenantId, id, chargeDto, userId);
  }
}