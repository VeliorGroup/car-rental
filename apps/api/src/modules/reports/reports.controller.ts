import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { GenerateReportDto, ReportFilterDto } from './dto/reports.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate and download a report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiProduces('application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv')
  async generateReport(
    @Req() req: any,
    @Body() data: GenerateReportDto,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.generateReport(
      req.user.tenantId,
      data,
      req.user.id,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(HttpStatus.OK).send(result.buffer);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get report generation history' })
  async getReportHistory(
    @Req() req: any,
    @Query() filters: ReportFilterDto,
  ) {
    return this.reportsService.getReportHistory(req.user.tenantId, {
      page: filters.page ? Number(filters.page) : undefined,
      limit: filters.limit ? Number(filters.limit) : undefined,
    });
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available report types' })
  async getReportTypes() {
    return {
      types: [
        { id: 'bookings', name: 'Bookings Report', description: 'All bookings with customer and vehicle details' },
        { id: 'vehicles', name: 'Vehicles Report', description: 'Fleet inventory with status and details' },
        { id: 'customers', name: 'Customers Report', description: 'Customer database with booking history' },
        { id: 'revenue', name: 'Revenue Report', description: 'Revenue breakdown by date' },
        { id: 'maintenance', name: 'Maintenance Report', description: 'Maintenance records and costs' },
        { id: 'damages', name: 'Damages Report', description: 'Damage records and costs' },
        { id: 'cautions', name: 'Cautions Report', description: 'Caution/deposit status' },
        { id: 'fleet_utilization', name: 'Fleet Utilization', description: 'Vehicle utilization rates' },
      ],
      formats: [
        { id: 'pdf', name: 'PDF', mimeType: 'application/pdf' },
        { id: 'excel', name: 'Excel', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { id: 'csv', name: 'CSV', mimeType: 'text/csv' },
      ],
    };
  }
}
