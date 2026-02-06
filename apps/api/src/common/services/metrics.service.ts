import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { register, Gauge, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly apiRequestsTotal: Counter<string>;
  private readonly apiRequestDuration: Histogram<string>;
  private readonly activeBookings: Gauge<string>;
  private readonly availableVehicles: Gauge<string>;
  private readonly pendingMaintenances: Gauge<string>;
  private readonly heldCautions: Gauge<string>;

  constructor(private prisma: PrismaService) {
    // Clear any existing metrics to prevent duplicates
    register.clear();

    // API Metrics
    this.apiRequestsTotal = new Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'endpoint', 'status'],
      registers: [register],
    });

    this.apiRequestDuration = new Histogram({
      name: 'api_request_duration_seconds',
      help: 'API request duration in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    // Business Metrics
    this.activeBookings = new Gauge({
      name: 'active_bookings_total',
      help: 'Total number of active bookings',
      labelNames: ['tenant_id'],
      registers: [register],
    });

    this.availableVehicles = new Gauge({
      name: 'available_vehicles_total',
      help: 'Total number of available vehicles',
      labelNames: ['tenant_id', 'category', 'location'],
      registers: [register],
    });

    this.pendingMaintenances = new Gauge({
      name: 'pending_maintenances_total',
      help: 'Total number of pending maintenances',
      labelNames: ['tenant_id', 'priority'],
      registers: [register],
    });

    this.heldCautions = new Gauge({
      name: 'held_cautions_total',
      help: 'Total amount of held cautions',
      labelNames: ['tenant_id'],
      registers: [register],
    });
  }

  // API Metrics
  recordApiRequest(method: string, endpoint: string, status: number, duration: number) {
    this.apiRequestsTotal.inc({ method, endpoint, status: status.toString() });
    this.apiRequestDuration.observe({ method, endpoint }, duration / 1000);
  }

  // Business Metrics Updates
  async updateActiveBookings(tenantId: string) {
    const count = await this.prisma.booking.count({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
      },
    });
    this.activeBookings.set({ tenant_id: tenantId }, count);
  }

  async updateAvailableVehicles(tenantId: string) {
    const vehicles = await this.prisma.vehicle.groupBy({
      by: ['category', 'location'],
      where: {
        tenantId,
        status: 'AVAILABLE',
        deletedAt: null,
      },
      _count: true,
    });

    // Reset gauges
    this.availableVehicles.reset();

    vehicles.forEach((group: { category: string; location: string; _count: number }) => {
      this.availableVehicles.set(
        {
          tenant_id: tenantId,
          category: group.category,
          location: group.location,
        },
        group._count,
      );
    });
  }

  async updatePendingMaintenances(tenantId: string) {
    const maintenances = await this.prisma.maintenance.groupBy({
      by: ['priority'],
      where: {
        tenantId,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      _count: true,
    });

    // Reset gauges
    this.pendingMaintenances.reset();

    maintenances.forEach((group: { priority: string; _count: number }) => {
      this.pendingMaintenances.set(
        {
          tenant_id: tenantId,
          priority: group.priority,
        },
        group._count,
      );
    });
  }

  async updateHeldCautions(tenantId: string) {
    const result = await this.prisma.caution.aggregate({
      where: {
        tenantId,
        status: 'HELD',
      },
      _sum: {
        amount: true,
      },
    });

    const total = result._sum.amount || 0;
    this.heldCautions.set({ tenant_id: tenantId }, Number(total));
  }

  // Get all metrics for Prometheus scraping
  async getMetrics() {
    return register.metrics();
  }

  // Record custom business event
  async recordEvent(tenantId: string, metricName: string, value: number, tags?: Record<string, string>) {
    await this.prisma.metric.create({
      data: {
        tenantId,
        metricName,
        value,
        tags: tags || {},
      },
    });
  }
}