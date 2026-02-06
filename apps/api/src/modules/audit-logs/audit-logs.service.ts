import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogFilterDto {
  page?: string;
  limit?: string;
  search?: string;
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: AuditLogFilterDto) {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '50');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { resource: { contains: filters.search, mode: 'insensitive' } },
        { resourceId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getStats(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, byAction, byResource] = await Promise.all([
      this.prisma.auditLog.count({
        where: { tenantId, createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: { resource: true },
      }),
    ]);

    return {
      total,
      byAction: Object.fromEntries(byAction.map(a => [a.action, a._count.action])),
      byResource: Object.fromEntries(byResource.map(r => [r.resource, r._count.resource])),
      period: `${days} days`,
    };
  }
}
