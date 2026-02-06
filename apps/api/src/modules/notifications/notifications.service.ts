import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, userId?: string) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        OR: [
          { userId: null }, // Broadcast notifications
          { userId: userId }, // User-specific notifications
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.notification.findFirst({
      where: { id, tenantId },
    });
  }

  async markAsRead(id: string, tenantId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(tenantId: string, userId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId,
        read: false,
        OR: [
          { userId: null },
          { userId: userId },
        ],
      },
      data: { read: true },
    });
  }

  async delete(id: string, tenantId: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async clearAll(tenantId: string, userId?: string) {
    // Simply delete all notifications for the tenant
    try {
      const result = await this.prisma.notification.deleteMany({
        where: { tenantId },
      });
      return result;
    } catch (error) {
      this.logger.error('Error clearing notifications:', error);
      throw error;
    }
  }

  async getStats(tenantId: string, userId?: string) {
    const [total, unread, today] = await Promise.all([
      this.prisma.notification.count({
        where: {
          tenantId,
          OR: [{ userId: null }, { userId }],
        },
      }),
      this.prisma.notification.count({
        where: {
          tenantId,
          read: false,
          OR: [{ userId: null }, { userId }],
        },
      }),
      this.prisma.notification.count({
        where: {
          tenantId,
          OR: [{ userId: null }, { userId }],
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return { total, unread, read: total - unread, today };
  }

  // Helper method to create notifications from other services
  // Prevents duplicate notifications for the same entity/type
  async create(data: {
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    userId?: string;
    branchId?: string;
    entityId?: string;
    entityType?: string;
    actionUrl?: string;
  }) {
    // Check if a notification for the same reason already exists (unread)
    if (data.entityId && data.entityType) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          tenantId: data.tenantId,
          entityId: data.entityId,
          entityType: data.entityType,
          type: data.type,
          read: false, // Only check unread notifications
        },
      });

      // If a similar unread notification exists, don't create a duplicate
      if (existing) {
        return existing;
      }
    }

    return this.prisma.notification.create({
      data,
    });
  }

  // Create notification for new booking
  async createBookingNotification(
    tenantId: string,
    bookingId: string,
    customerName: string,
  ) {
    return this.create({
      tenantId,
      type: 'BOOKING',
      title: 'Nuova Prenotazione',
      message: `Nuova prenotazione creata per ${customerName}`,
      entityId: bookingId,
      entityType: 'booking',
      actionUrl: `/bookings/${bookingId}`,
    });
  }

  // Create notification for damage report
  async createDamageNotification(
    tenantId: string,
    damageId: string,
    vehiclePlate: string,
  ) {
    return this.create({
      tenantId,
      type: 'DAMAGE',
      title: 'Nuovo Danno Segnalato',
      message: `Danno segnalato sul veicolo ${vehiclePlate}`,
      entityId: damageId,
      entityType: 'damage',
      actionUrl: `/damages/${damageId}`,
    });
  }

  // Create notification for maintenance
  async createMaintenanceNotification(
    tenantId: string,
    maintenanceId: string,
    vehiclePlate: string,
  ) {
    return this.create({
      tenantId,
      type: 'MAINTENANCE',
      title: 'Manutenzione Programmata',
      message: `Manutenzione richiesta per veicolo ${vehiclePlate}`,
      entityId: maintenanceId,
      entityType: 'maintenance',
      actionUrl: `/maintenance/${maintenanceId}`,
    });
  }

  // Create notification for caution release
  async createCautionNotification(
    tenantId: string,
    cautionId: string,
    bookingRef: string,
  ) {
    return this.create({
      tenantId,
      type: 'CAUTION',
      title: 'Cauzione Pronta per Rilascio',
      message: `La cauzione per la prenotazione ${bookingRef} è pronta per il rilascio`,
      entityId: cautionId,
      entityType: 'caution',
    });
  }

  // Create notification for license expiry
  async createExpiryNotification(
    tenantId: string,
    customerId: string,
    customerName: string,
    daysUntilExpiry: number,
  ) {
    return this.create({
      tenantId,
      type: 'EXPIRY',
      title: 'Patente in Scadenza',
      message: `La patente di ${customerName} scade tra ${daysUntilExpiry} giorni`,
      entityId: customerId,
      entityType: 'customer',
      actionUrl: `/customers/${customerId}`,
    });
  }

  // Create notification for insurance expiry
  async createInsuranceExpiryNotification(
    tenantId: string,
    vehicleId: string,
    licensePlate: string,
    daysUntilExpiry: number,
  ) {
    return this.create({
      tenantId,
      type: 'EXPIRY',
      title: 'Assicurazione in Scadenza',
      message: daysUntilExpiry <= 0
        ? `L'assicurazione del veicolo ${licensePlate} è SCADUTA!`
        : `L'assicurazione del veicolo ${licensePlate} scade tra ${daysUntilExpiry} giorni`,
      entityId: vehicleId,
      entityType: 'vehicle',
      actionUrl: `/vehicles/${vehicleId}`,
    });
  }

  // Create notification for review (revisione) expiry
  async createReviewExpiryNotification(
    tenantId: string,
    vehicleId: string,
    licensePlate: string,
    daysUntilExpiry: number,
  ) {
    return this.create({
      tenantId,
      type: 'EXPIRY',
      title: 'Revisione in Scadenza',
      message: daysUntilExpiry <= 0
        ? `La revisione del veicolo ${licensePlate} è SCADUTA!`
        : `La revisione del veicolo ${licensePlate} scade tra ${daysUntilExpiry} giorni`,
      entityId: vehicleId,
      entityType: 'vehicle',
      actionUrl: `/vehicles/${vehicleId}`,
    });
  }

  // Create notification for overdue booking return
  async createOverdueReturnNotification(
    tenantId: string,
    bookingId: string,
    licensePlate: string,
    customerName: string,
    hoursOverdue: number,
  ) {
    return this.create({
      tenantId,
      type: 'BOOKING',
      title: 'Veicolo Non Riconsegnato',
      message: `Il veicolo ${licensePlate} non è stato riconsegnato da ${customerName}. In ritardo di ${hoursOverdue} ore.`,
      entityId: bookingId,
      entityType: 'booking',
      actionUrl: `/bookings/${bookingId}`,
    });
  }
}
