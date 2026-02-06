import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogsService, AuditLogFilterDto } from './audit-logs.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs for tenant' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resource', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async findAll(@Req() req: any, @Query() filters: AuditLogFilterDto) {
    return this.auditLogsService.findAll(req.user.tenantId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze' })
  async getStats(@Req() req: any, @Query('days') days?: string) {
    return this.auditLogsService.getStats(
      req.user.tenantId,
      days ? parseInt(days) : 30,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.auditLogsService.findOne(req.user.tenantId, id);
  }
}
