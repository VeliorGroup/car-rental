import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('branches')
@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
@ApiBearerAuth()
export class BranchesController {

  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  async create(@Body() createBranchDto: CreateBranchDto, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.branchesService.create(tenantId, createBranchDto);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get all branches' })
  @ApiResponse({ status: 200, description: 'Branches retrieved successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const tenantId = req.tenant.id;
    return this.branchesService.findAll(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
    );
  }

  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get branch statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats(@Req() req: any, @Query('search') search?: string) {
    const tenantId = req.tenant.id;
    return this.branchesService.getStats(tenantId, search);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get a branch by ID' })
  @ApiResponse({ status: 200, description: 'Branch retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.branchesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async update(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant.id;
    return this.branchesService.update(tenantId, id, updateBranchDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 204, description: 'Branch deleted successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant.id;
    return this.branchesService.remove(tenantId, id);
  }
}
