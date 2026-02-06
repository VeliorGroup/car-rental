import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayseraService } from '../../common/services/paysera.service';
import { PdfService } from '../../common/services/pdf.service';
import { EmailService } from '../../common/services/email.service';
import { StorageService } from '../../common/services/storage.service';
import { MetricsService } from '../../common/services/metrics.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateCautionDto, UpdateCautionDto, CautionFilterDto, ReleaseCautionDto, ChargeCautionDto } from './dto/caution.dto';
import { Caution, CautionStatus, PaymentMethod } from '@prisma/client';
import { QueueService } from '../../common/queue/queue.service';

@Injectable()
export class CautionsService {
  constructor(
    private prisma: PrismaService,
    private payseraService: PayseraService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private storageService: StorageService,
    private metricsService: MetricsService,
    private auditService: AuditService,
    private queueService: QueueService,
  ) {}

  async findAll(tenantId: string, filters: CautionFilterDto): Promise<{
    cautions: (Caution & { booking: any })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Apply filters
    if (filters.bookingId) {
      where.bookingId = filters.bookingId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.payseraOrderId) {
      where.payseraOrderId = filters.payseraOrderId;
    }

    if (filters.heldFrom || filters.heldTo) {
      where.heldAt = {};
      if (filters.heldFrom) where.heldAt.gte = new Date(filters.heldFrom);
      if (filters.heldTo) where.heldAt.lte = new Date(filters.heldTo);
    }

    // Support startFrom/endTo as aliases for date filtering
    if (filters.startFrom || filters.endTo) {
      where.heldAt = where.heldAt || {};
      if (filters.startFrom) where.heldAt.gte = new Date(filters.startFrom);
      if (filters.endTo) where.heldAt.lte = new Date(filters.endTo);
    }

    if (filters.search) {
      where.OR = [
        { booking: { customer: { firstName: { contains: filters.search, mode: 'insensitive' } } } },
        { booking: { customer: { lastName: { contains: filters.search, mode: 'insensitive' } } } },
        { booking: { vehicle: { licensePlate: { contains: filters.search, mode: 'insensitive' } } } },
        { booking: { vehicle: { brand: { contains: filters.search, mode: 'insensitive' } } } },
        { booking: { vehicle: { model: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    // Build order by
    const orderBy = { [filters.sortBy || 'createdAt']: filters.order || 'desc' };

    const [cautions, total] = await Promise.all([
      this.prisma.caution.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          booking: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              vehicle: {
                select: {
                  id: true,
                  licensePlate: true,
                  brand: true,
                  model: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.caution.count({ where }),
    ]);

    return { cautions, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<Caution & { booking: any }> {
    const caution = await this.prisma.caution.findFirst({
      where: { id, tenantId },
      include: {
        booking: {
          include: {
            customer: true,
            vehicle: true,
          },
        },
      },
    });

    if (!caution) {
      throw new NotFoundException('Caution not found');
    }

    return caution;
  }

  async update(tenantId: string, id: string, data: UpdateCautionDto, userId: string): Promise<Caution> {
    const caution = await this.prisma.caution.findFirst({
      where: { id, tenantId },
    });

    if (!caution) {
      throw new NotFoundException('Caution not found');
    }

    // Store old values for audit
    const oldValues = { ...caution };

    const updatedCaution = await this.prisma.caution.update({
      where: { id },
      data,
    });

    // Audit log
    await this.auditService.log(tenantId, 'UPDATE_CAUTION', 'Caution', id, userId, oldValues, updatedCaution);

    return updatedCaution;
  }

  async release(
    tenantId: string,
    id: string,
    data: ReleaseCautionDto,
    userId: string,
  ): Promise<Caution> {
    const caution = await this.prisma.caution.findFirst({
      where: { id, tenantId },
      include: {
        booking: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!caution) {
      throw new NotFoundException('Caution not found');
    }

    if (caution.status !== CautionStatus.HELD) {
      throw new ForbiddenException('Can only release held cautions');
    }

    // Store old values for audit
    const oldValues = { ...caution };

    let updatedCaution: Caution;

    if (caution.paymentMethod === PaymentMethod.PAYSERA && caution.payseraOrderId) {
      // Release via Paysera
      try {
        await this.payseraService.releaseHeldAmount(caution.payseraOrderId);
        
        updatedCaution = await this.prisma.caution.update({
          where: { id },
          data: {
            status: CautionStatus.RELEASED,
            releasedAt: new Date(),
          },
        });

        // Send release email
        await this.queueService.add('caution-notifications','send-release', {
          cautionId: id,
          tenantId,
          bookingId: caution.bookingId,
          customerId: caution.booking.customerId,
          amount: caution.amount,
          reason: data.reason,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await this.prisma.caution.update({
          where: { id },
          data: {
            status: CautionStatus.FAILED,
            failureReason: `Release failed: ${errorMsg}`,
          },
        });
        throw new BadRequestException(`Paysera release failed: ${errorMsg}`);
      }
    } else if (caution.paymentMethod === PaymentMethod.CASH) {
      // Release cash caution
      updatedCaution = await this.prisma.caution.update({
        where: { id },
        data: {
          status: CautionStatus.RELEASED,
          releasedAt: new Date(),
        },
      });

      // Generate cash release receipt
      const pdfBuffer = await this.pdfService.generateCautionReleasePDF(caution, data.reason);
      const pdfKey = await this.storageService.uploadBuffer(
        pdfBuffer,
        `cautions/${tenantId}/${id}`,
        `release-receipt-${id}.pdf`,
        'application/pdf',
      );

      // Update caution with receipt
      updatedCaution = await this.prisma.caution.update({
        where: { id },
        data: { cashReceiptKey: pdfKey },
      });

      // Send release email
      await this.queueService.add('caution-notifications','send-cash-release', {
        cautionId: id,
        tenantId,
        bookingId: caution.bookingId,
        customerId: caution.booking.customerId,
        amount: caution.amount,
        reason: data.reason,
        pdfKey,
      });
    } else {
      throw new BadRequestException('Unsupported payment method for release');
    }

    // Record metric
    await this.metricsService.recordEvent(tenantId, 'caution_released', 1, {
      paymentMethod: caution.paymentMethod,
      amount: String(caution.amount),
    });

    // Audit log
    await this.auditService.log(tenantId, 'RELEASE_CAUTION', 'Caution', id, userId, oldValues, updatedCaution);

    return updatedCaution;
  }

  async charge(
    tenantId: string,
    id: string,
    data: ChargeCautionDto,
    userId: string,
  ): Promise<Caution> {
    const caution = await this.prisma.caution.findFirst({
      where: { id, tenantId },
      include: {
        booking: {
          include: {
            customer: true,
            damages: true,
          },
        },
      },
    });

    if (!caution) {
      throw new NotFoundException('Caution not found');
    }

    if (caution.status !== CautionStatus.HELD) {
      throw new ForbiddenException('Can only charge held cautions');
    }

    const chargeAmount = parseFloat(data.amount);
    if (chargeAmount > parseFloat(caution.amount.toString())) {
      throw new BadRequestException('Charge amount cannot exceed held amount');
    }

    // Store old values for audit
    const oldValues = { ...caution };

    let updatedCaution: Caution;

    if (caution.paymentMethod === PaymentMethod.PAYSERA && caution.payseraOrderId) {
      // Charge via Paysera
      try {
        const final = chargeAmount === parseFloat(caution.amount.toString());
        await this.payseraService.captureHeldAmount(
          caution.payseraOrderId,
          chargeAmount,
          final,
        );

        updatedCaution = await this.prisma.caution.update({
          where: { id },
          data: {
            status: final ? CautionStatus.FULLY_CHARGED : CautionStatus.PARTIALLY_CHARGED,
            chargedAmount: chargeAmount,
            chargedAt: new Date(),
          },
        });

        // Send charge email
        await this.queueService.add('caution-notifications','send-charge', {
          cautionId: id,
          tenantId,
          bookingId: caution.bookingId,
          customerId: caution.booking.customerId,
          amount: chargeAmount,
          reason: data.reason,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await this.prisma.caution.update({
          where: { id },
          data: {
            status: CautionStatus.FAILED,
            failureReason: `Charge failed: ${errorMsg}`,
          },
        });
        throw new BadRequestException(`Paysera charge failed: ${errorMsg}`);
      }
    } else if (caution.paymentMethod === PaymentMethod.CASH) {
      // Process cash charge
      updatedCaution = await this.prisma.caution.update({
        where: { id },
        data: {
          status: CautionStatus.FULLY_CHARGED,
          chargedAmount: chargeAmount,
          chargedAt: new Date(),
        },
      });

      // Generate cash charge receipt
      const pdfBuffer = await this.pdfService.generateCautionChargePDF(caution, chargeAmount, data.reason);
      const pdfKey = await this.storageService.uploadBuffer(
        pdfBuffer,
        `cautions/${tenantId}/${id}`,
        `charge-receipt-${id}.pdf`,
        'application/pdf',
      );

      // Update caution with receipt
      updatedCaution = await this.prisma.caution.update({
        where: { id },
        data: { cashReceiptKey: pdfKey },
      });

      // Send charge email
      await this.queueService.add('caution-notifications','send-cash-charge', {
        cautionId: id,
        tenantId,
        bookingId: caution.bookingId,
        customerId: caution.booking.customerId,
        amount: chargeAmount,
        reason: data.reason,
        pdfKey,
      });
    } else {
      throw new BadRequestException('Unsupported payment method for charge');
    }

    // Record metric
    await this.metricsService.recordEvent(tenantId, 'caution_charged', 1, {
      paymentMethod: caution.paymentMethod,
      amount: String(chargeAmount),
    });

    // Audit log
    await this.auditService.log(tenantId, 'CHARGE_CAUTION', 'Caution', id, userId, oldValues, updatedCaution);

    return updatedCaution;
  }

  async handleWebhook(payload: any): Promise<void> {
    // Verify signature
    if (!this.payseraService.verifyWebhookSignature(payload)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { orderid, status } = payload;

    // Find caution by Paysera order ID
    const caution = await this.prisma.caution.findFirst({
      where: { payseraOrderId: orderid },
      include: {
        booking: true,
      },
    });

    if (!caution) {
      throw new NotFoundException('Caution not found for order ID');
    }

    // Idempotency check
    if (caution.status === CautionStatus.HELD && status === '1') {
      // Already processed
      return;
    }

    // Update caution based on status
    let updateData: any = {};

    switch (status) {
      case '1': // Held
        updateData = {
          status: CautionStatus.HELD,
          heldAt: new Date(),
        };
        break;
      case '2': // Released
        updateData = {
          status: CautionStatus.RELEASED,
          releasedAt: new Date(),
        };
        break;
      case '3': // Charged
        updateData = {
          status: CautionStatus.FULLY_CHARGED,
          chargedAt: new Date(),
          chargedAmount: parseFloat(payload.amount),
        };
        break;
      default:
        throw new BadRequestException(`Unknown status: ${status}`);
    }

    const updatedCaution = await this.prisma.caution.update({
      where: { id: caution.id },
      data: updateData,
    });

    // Send notification
    await this.queueService.add('caution-notifications','webhook-processed', {
      cautionId: caution.id,
      tenantId: caution.tenantId,
      bookingId: caution.bookingId,
      status,
    });

    // Audit log
    await this.auditService.log(caution.tenantId, 'WEBHOOK_CAUTION', 'Caution', caution.id, 'SYSTEM',
      { status: caution.status },
      { status: updateData.status },
    );
  }

  async getStats(tenantId: string, startFrom?: string, endTo?: string, search?: string): Promise<{
    totalHeld: number;
    totalReleased: number;
    totalCharged: number;
    totalAmountHeld: number;
    totalAmountReleased: number;
    totalAmountCharged: number;
  }> {
    const where: any = { tenantId };
    
    // Apply date filter - filter by heldAt date
    if (startFrom || endTo) {
      where.heldAt = {};
      if (startFrom) where.heldAt.gte = new Date(startFrom);
      if (endTo) where.heldAt.lte = new Date(endTo);
    }

    // Apply search filter - search in booking customer name
    if (search) {
      where.booking = {
        OR: [
          { customer: { firstName: { contains: search, mode: 'insensitive' } } },
          { customer: { lastName: { contains: search, mode: 'insensitive' } } },
          { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const stats = await this.prisma.caution.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: {
        amount: true,
        chargedAmount: true,
      },
    });

    const result = {
      totalHeld: 0,
      totalReleased: 0,
      totalCharged: 0,
      totalAmountHeld: 0,
      totalAmountReleased: 0,
      totalAmountCharged: 0,
    };

    for (const stat of stats) {
      switch (stat.status) {
        case CautionStatus.HELD:
          result.totalHeld = stat._count;
          result.totalAmountHeld = Number(stat._sum.amount || 0);
          break;
        case CautionStatus.RELEASED:
          result.totalReleased = stat._count;
          result.totalAmountReleased = Number(stat._sum.amount || 0);
          break;
        case CautionStatus.PARTIALLY_CHARGED:
        case CautionStatus.FULLY_CHARGED:
          result.totalCharged += stat._count;
          result.totalAmountCharged += Number(stat._sum.chargedAmount || 0);
          break;
      }
    }

    return result;
  }
}