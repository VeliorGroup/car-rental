import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UploadedFiles, Query, Req, UseGuards, Res, StreamableFile } from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto } from './dto/create-customer.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
export class CustomersController {

  constructor(private readonly customersService: CustomersService) { }

  @Get('export')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Export customers to Excel' })
  async export(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tenantId = req.user!.tenantId;
    const buffer = await this.customersService.exportCustomers(tenantId);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="customers.xlsx"',
    });

    return new StreamableFile(buffer);
  }



  @Post('import')
  @Roles('ADMIN', 'MANAGER')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import customers from Excel' })
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.customersService.importCustomers(tenantId, file.buffer, userId);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new customer with documents' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'licenseFront', maxCount: 1 },
    { name: 'licenseBack', maxCount: 1 },
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
  ]))
  create(
    @Req() req: Request,
    @Body() createCustomerDto: CreateCustomerDto,
    @UploadedFiles() files: {
      licenseFront?: Express.Multer.File[];
      licenseBack?: Express.Multer.File[];
      idCardFront?: Express.Multer.File[];
      idCardBack?: Express.Multer.File[];
    },
  ) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.customersService.create(tenantId, createCustomerDto, {
      licenseFront: files?.licenseFront?.[0],
      licenseBack: files?.licenseBack?.[0],
      idCardFront: files?.idCardFront?.[0],
      idCardBack: files?.idCardBack?.[0],
    }, userId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'List customers with filters' })
  findAll(@Req() req: Request, @Query() filters: CustomerFilterDto) {
    const tenantId = req.user!.tenantId;
    return this.customersService.findAll(tenantId, filters);
  }

  @Get('stats/summary')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get customer statistics summary' })
  async getStatsSummary(@Req() req: Request, @Query('search') search?: string) {
    const tenantId = req.user!.tenantId;
    return this.customersService.getStatsSummary(tenantId, search);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Get customer details' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.user!.tenantId;
    return this.customersService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update customer details and documents' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'licenseFront', maxCount: 1 },
    { name: 'licenseBack', maxCount: 1 },
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
  ]))
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @UploadedFiles() files: {
      licenseFront?: Express.Multer.File[];
      licenseBack?: Express.Multer.File[];
      idCardFront?: Express.Multer.File[];
      idCardBack?: Express.Multer.File[];
    },
  ) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.customersService.update(tenantId, id, updateCustomerDto, {
      licenseFront: files?.licenseFront?.[0],
      licenseBack: files?.licenseBack?.[0],
      idCardFront: files?.idCardFront?.[0],
      idCardBack: files?.idCardBack?.[0],
    }, userId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Soft delete customer' })
  remove(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    return this.customersService.remove(tenantId, id, userId);
  }

  @Get(':id/bookings')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'Get customer booking history' })
  getBookings(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.user!.tenantId;
    return this.customersService.getCustomerBookings(tenantId, id);
  }
}
