import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { MetricsService } from './common/services/metrics.service';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: 'connected' | 'disconnected';
  version: string;
}

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint with system metrics' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async getHealth(): Promise<HealthResponse> {
    // Check database connectivity
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    
    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / totalMem) * 100 * 100) / 100,
      },
      database: dbStatus,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  }
}