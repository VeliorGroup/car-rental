import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { EmailService } from '../../common/services/email.service';
import { MetricsService } from '../../common/services/metrics.service';
import { AuditService } from '../../common/services/audit.service';
import { PdfService } from '../../common/services/pdf.service';
import { CreateMaintenanceDto, UpdateMaintenanceDto, MaintenanceFilterDto, AssignMechanicDto, AddNoteDto, AddPhotoDto } from './dto/maintenance.dto';
import { Maintenance, MaintenanceStatus, MaintenanceType, MaintenancePriority } from '@prisma/client';
import { QueueService } from '../../common/queue/queue.service';
import { addDays, isAfter, isBefore } from 'date-fns';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  async create(tenantId: string, data: CreateMaintenanceDto, userId: string): Promise<Maintenance> {
    // Verify vehicle
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: data.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Verify mechanic if provided
    if (data.mechanicId) {
      const mechanic = await this.prisma.user.findFirst({
        where: { id: data.mechanicId, tenantId, role: { name: 'MECHANIC' } },
      });

      if (!mechanic) {
        throw new NotFoundException('Mechanic not found');
      }
    }

    // Create maintenance record
    const maintenance = await this.prisma.createWithTenant('maintenance', tenantId, {
        vehicleId: data.vehicleId,
        title: data.title,
        type: data.type,
        description: data.description,
        priority: data.priority || MaintenancePriority.MEDIUM,
        mechanicId: data.mechanicId,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        status: MaintenanceStatus.SCHEDULED,
        notes: data.notes || [],
    });

    // Queue notification
    await this.queueService.add('maintenance', 'maintenance-scheduled', {
      maintenanceId: maintenance.id,
      tenantId,
      vehicleId: data.vehicleId,
      mechanicId: data.mechanicId,
      scheduledFor: data.scheduledFor,
    });

    // Record metric
    await this.metricsService.recordEvent(tenantId, 'maintenance_scheduled', 1, {
      type: data.type,
      priority: data.priority ?? '',
    });

    // Audit log
    await this.auditService.log(tenantId, 'CREATE_MAINTENANCE', 'Maintenance', maintenance.id, userId, null, maintenance);

    return maintenance;
  }




  async findAll(tenantId: string, filters: MaintenanceFilterDto): Promise<{
    maintenances: (Maintenance & { vehicle: any; mechanic: any })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Apply filters
    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.mechanicId) {
      where.mechanicId = filters.mechanicId;
    }

    if (filters.scheduledFrom || filters.scheduledTo) {
      where.scheduledFor = {};
      if (filters.scheduledFrom) {
        where.scheduledFor.gte = new Date(filters.scheduledFrom);
      }
      if (filters.scheduledTo) {
        where.scheduledFor.lte = new Date(filters.scheduledTo);
      }
    }

    // Build order by
    const orderBy = { [filters.sortBy || 'scheduledFor']: filters.order || 'asc' };

    const [maintenances, total] = await Promise.all([
      this.prisma.maintenance.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              brand: true,
              model: true,
              currentKm: true,
            },
          },
          mechanic: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.maintenance.count({ where }),
    ]);

    return { maintenances, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<Maintenance & { vehicle: any; mechanic: any }> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
        mechanic: true,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    return maintenance;
  }

  async update(tenantId: string, id: string, data: UpdateMaintenanceDto, userId: string): Promise<Maintenance> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
        mechanic: true,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    // Store old values for audit
    const oldValues = { ...maintenance };

    // If marking as completed, set completedAt
    if (data.status === MaintenanceStatus.COMPLETED && !data.completedAt) {
      data.completedAt = new Date().toISOString();
    }

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: { id },
      data: {
        ...data,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      },
    });

    // If completed, update vehicle status and send notification
    if (data.status === MaintenanceStatus.COMPLETED) {
      await this.prisma.vehicle.update({
        where: { id: maintenance.vehicleId },
        data: { status: 'AVAILABLE' },
      });

      await this.queueService.add('maintenance', 'maintenance-completed', {
        maintenanceId: id,
        tenantId,
        vehicleId: maintenance.vehicleId,
        mechanicId: maintenance.mechanicId,
      });
    }

    // Audit log
    await this.auditService.log(tenantId, 'UPDATE_MAINTENANCE', 'Maintenance', id, userId, oldValues, updatedMaintenance);

    return updatedMaintenance;
  }

  async assignMechanic(tenantId: string, id: string, data: AssignMechanicDto, userId: string): Promise<Maintenance> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: { id, tenantId },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    // Verify mechanic exists and is a mechanic
    const mechanic = await this.prisma.user.findFirst({
      where: { id: data.mechanicId, tenantId, role: { name: 'MECHANIC' } },
    });

    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: { id },
      data: {
        mechanicId: data.mechanicId,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : maintenance.scheduledFor,
      },
      include: {
        vehicle: true,
        mechanic: true,
      },
    });

    // Queue notification
    await this.queueService.add('maintenance', 'maintenance-assigned', {
      maintenanceId: id,
      tenantId,
      mechanicId: data.mechanicId,
      scheduledFor: data.scheduledFor,
    });

    // Audit log
    await this.auditService.log(tenantId, 'ASSIGN_MECHANIC', 'Maintenance', id, userId, { mechanicId: maintenance.mechanicId }, updatedMaintenance);

    return updatedMaintenance;
  }

  async addNote(tenantId: string, id: string, data: AddNoteDto, userId: string): Promise<Maintenance> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: { id, tenantId },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: { id },
      data: {
        notes: {
          push: `[${new Date().toISOString()}] ${data.note} - by ${userId}`,
        },
      },
    });

    // Audit log
    await this.auditService.log(tenantId, 'ADD_MAINTENANCE_NOTE', 'Maintenance', id, userId, null, { note: data.note });

    return updatedMaintenance;
  }

  async addPhoto(tenantId: string, id: string, data: AddPhotoDto, userId: string): Promise<Maintenance> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: { id, tenantId },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    // Upload photo to storage (implementation pending)
    // const photoUrl = await this.storageService.uploadMaintenancePhoto(id, data.photo);

    const updatedMaintenance = await this.prisma.maintenance.update({
      where: { id },
      data: {
        photos: {
          push: data.photo, // In real implementation, this would be the URL
        },
      },
    });

    // Audit log
    await this.auditService.log(tenantId, 'ADD_MAINTENANCE_PHOTO', 'Maintenance', id, userId, null, { photo: data.photo });

    return updatedMaintenance;
  }

  async getCalendar(tenantId: string, startDate: string, endDate: string): Promise<any[]> {
    const maintenances = await this.prisma.maintenance.findMany({
      where: {
        tenantId,
        scheduledFor: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
          },
        },
        mechanic: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    return maintenances.map(maintenance => ({
      id: maintenance.id,
      title: `${maintenance.title} - ${maintenance.vehicle.brand} ${maintenance.vehicle.model}`,
      start: maintenance.scheduledFor,
      end: maintenance.scheduledFor ? addDays(maintenance.scheduledFor, 1) : null,
      resourceId: maintenance.mechanicId,
      vehicleId: maintenance.vehicleId,
      status: maintenance.status,
      priority: maintenance.priority,
    }));
  }

  async getMechanicWorkload(tenantId: string, mechanicId: string, startDate: string, endDate: string): Promise<{
    mechanic: any;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    tasks: any[];
  }> {
    const mechanic = await this.prisma.user.findFirst({
      where: { id: mechanicId, tenantId, role: { name: 'MECHANIC' } },
    });

    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    const tasks = await this.prisma.maintenance.findMany({
      where: {
        tenantId,
        mechanicId,
        scheduledFor: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === MaintenanceStatus.COMPLETED).length;
    const pendingTasks = tasks.filter(t => t.status !== MaintenanceStatus.COMPLETED).length;

    return {
      mechanic,
      totalTasks,
      completedTasks,
      pendingTasks,
      tasks,
    };
  }

  async getStats(tenantId: string, startFrom?: string, endTo?: string, search?: string): Promise<{
    totalMaintenances: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    overdueCount: number;
    avgCompletionTime: number;
  }> {
    const where: any = { tenantId };
    
    // Apply date filter - filter by scheduledFor date
    if (startFrom || endTo) {
      where.scheduledFor = {};
      if (startFrom) where.scheduledFor.gte = new Date(startFrom);
      if (endTo) where.scheduledFor.lte = new Date(endTo);
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const maintenances = await this.prisma.maintenance.findMany({
      where,
      include: {
        vehicle: true,
      },
    });

    const now = new Date();
    const stats: {
      totalMaintenances: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
      overdueCount: number;
      avgCompletionTime: number;
    } = {
      totalMaintenances: maintenances.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      overdueCount: 0,
      avgCompletionTime: 0,
    };

    // Group by status, type, priority
    for (const maintenance of maintenances) {
      stats.byStatus[maintenance.status] = (stats.byStatus[maintenance.status] || 0) + 1;
      stats.byType[maintenance.type] = (stats.byType[maintenance.type] || 0) + 1;
      stats.byPriority[maintenance.priority] = (stats.byPriority[maintenance.priority] || 0) + 1;

      // Count overdue
      if (maintenance.scheduledFor && isBefore(maintenance.scheduledFor, now) && maintenance.status !== MaintenanceStatus.COMPLETED) {
        stats.overdueCount++;
      }
    }

    // Calculate average completion time
    const completedMaintenances = maintenances.filter(m => m.status === MaintenanceStatus.COMPLETED && m.completedAt);
    if (completedMaintenances.length > 0) {
      const totalHours = completedMaintenances.reduce((sum, m) => {
        const start = m.scheduledFor || m.createdAt;
        const end = m.completedAt!;
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      stats.avgCompletionTime = totalHours / completedMaintenances.length;
    }

    return stats;
  }

  async generateWorkOrder(tenantId: string, id: string): Promise<Buffer> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
        mechanic: true,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    return this.pdfService.generateWorkOrder(maintenance);
  }

  async remove(tenantId: string, id: string, userId: string): Promise<void> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: { id, tenantId },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    // Hard delete
    await this.prisma.maintenance.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log(tenantId, 'DELETE_MAINTENANCE', 'Maintenance', id, userId, maintenance, null);
  }
}