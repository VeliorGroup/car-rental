import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Check for expiring insurance and review dates every day at 8 AM
   * Creates notifications for vehicles expiring in 30, 14, 7, 3, 1, 0 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkVehicleExpiries() {
    this.logger.log('Checking vehicle insurance and review expiries...');

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const checkDays = [30, 14, 7, 3, 1, 0]; // Days before expiry to notify
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const tenant of tenants) {
      // Get all vehicles for this tenant
      const vehicles = await this.prisma.vehicle.findMany({
        where: { 
          tenantId: tenant.id,
          status: { not: 'OUT_OF_SERVICE' },
        },
        select: {
          id: true,
          licensePlate: true,
          insuranceExpiry: true,
          reviewDate: true,
        },
      });

      for (const vehicle of vehicles) {
        // Check insurance expiry
        if (vehicle.insuranceExpiry) {
          const expiryDate = new Date(vehicle.insuranceExpiry);
          expiryDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (checkDays.includes(daysUntilExpiry) || daysUntilExpiry < 0) {
            // Check if notification already sent today
            const existingNotification = await this.prisma.notification.findFirst({
              where: {
                tenantId: tenant.id,
                entityId: vehicle.id,
                entityType: 'vehicle',
                title: 'Assicurazione in Scadenza',
                createdAt: { gte: today },
              },
            });

            if (!existingNotification) {
              await this.notificationsService.createInsuranceExpiryNotification(
                tenant.id,
                vehicle.id,
                vehicle.licensePlate,
                Math.max(0, daysUntilExpiry),
              );
              this.logger.log(`Insurance expiry notification sent for ${vehicle.licensePlate}`);
            }
          }
        }

        // Check review (revisione) expiry
        if (vehicle.reviewDate) {
          const reviewDate = new Date(vehicle.reviewDate);
          reviewDate.setHours(0, 0, 0, 0);
          const daysUntilReview = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (checkDays.includes(daysUntilReview) || daysUntilReview < 0) {
            const existingNotification = await this.prisma.notification.findFirst({
              where: {
                tenantId: tenant.id,
                entityId: vehicle.id,
                entityType: 'vehicle',
                title: 'Revisione in Scadenza',
                createdAt: { gte: today },
              },
            });

            if (!existingNotification) {
              await this.notificationsService.createReviewExpiryNotification(
                tenant.id,
                vehicle.id,
                vehicle.licensePlate,
                Math.max(0, daysUntilReview),
              );
              this.logger.log(`Review expiry notification sent for ${vehicle.licensePlate}`);
            }
          }
        }
      }
    }

    this.logger.log('Vehicle expiry check completed.');
  }

  /**
   * Check for overdue booking returns every hour
   * Creates notifications for bookings where endDate has passed but status is still CONFIRMED
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueReturns() {
    this.logger.log('Checking for overdue booking returns...');

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active bookings that are overdue
    const overdueBookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        endDate: { lt: now },
      },
      include: {
        vehicle: { select: { licensePlate: true } },
        customer: { select: { firstName: true, lastName: true } },
        tenant: { select: { id: true, isActive: true } },
      },
    });

    for (const booking of overdueBookings) {
      if (!booking.tenant.isActive) continue;

      const hoursOverdue = Math.floor((now.getTime() - booking.endDate.getTime()) / (1000 * 60 * 60));
      
      // Only notify for 1, 2, 4, 8, 24, 48 hours overdue
      const notifyHours = [1, 2, 4, 8, 24, 48];
      if (!notifyHours.includes(hoursOverdue)) continue;

      // Check if notification already sent for this hour
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          tenantId: booking.tenantId,
          entityId: booking.id,
          entityType: 'booking',
          title: 'Veicolo Non Riconsegnato',
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) }, // Last hour
        },
      });

      if (!existingNotification) {
        await this.notificationsService.createOverdueReturnNotification(
          booking.tenantId,
          booking.id,
          booking.vehicle.licensePlate,
          `${booking.customer.firstName} ${booking.customer.lastName}`,
          hoursOverdue,
        );
        this.logger.log(`Overdue return notification sent for booking ${booking.id}`);
      }
    }

    this.logger.log('Overdue return check completed.');
  }
}
