import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { AuditService } from '../../common/services/audit.service';
import { GenerateReportDto, ReportType, ExportFormat } from './dto/reports.dto';
import * as ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditService: AuditService,
  ) {}

  async generateReport(tenantId: string, data: GenerateReportDto, userId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    this.logger.log(`Generating ${data.type} report in ${data.format} format for tenant ${tenantId}`);

    const reportData = await this.fetchReportData(tenantId, data);
    
    let result: { buffer: Buffer; filename: string; mimeType: string };

    switch (data.format) {
      case ExportFormat.EXCEL:
        result = await this.generateExcel(data.type, reportData, tenantId);
        break;
      case ExportFormat.CSV:
        result = await this.generateCsv(data.type, reportData, tenantId);
        break;
      case ExportFormat.PDF:
        result = await this.generatePdf(data.type, reportData, tenantId);
        break;
      default:
        throw new BadRequestException('Unsupported format');
    }

    // Audit log
    await this.auditService.log(
      tenantId,
      'GENERATE_REPORT',
      'Report',
      '',
      userId,
      null,
      { type: data.type, format: data.format, rowCount: reportData.length }
    );

    return result;
  }

  private async fetchReportData(tenantId: string, data: GenerateReportDto): Promise<Record<string, unknown>[]> {
    const startDate = data.startDate ? new Date(data.startDate) : startOfMonth(new Date());
    const endDate = data.endDate ? new Date(data.endDate) : endOfMonth(new Date());

    switch (data.type) {
      case ReportType.BOOKINGS:
        return this.fetchBookingsData(tenantId, startDate, endDate, data);
      case ReportType.VEHICLES:
        return this.fetchVehiclesData(tenantId, data);
      case ReportType.CUSTOMERS:
        return this.fetchCustomersData(tenantId, data);
      case ReportType.REVENUE:
        return this.fetchRevenueData(tenantId, startDate, endDate);
      case ReportType.MAINTENANCE:
        return this.fetchMaintenanceData(tenantId, startDate, endDate, data);
      case ReportType.DAMAGES:
        return this.fetchDamagesData(tenantId, startDate, endDate, data);
      case ReportType.CAUTIONS:
        return this.fetchCautionsData(tenantId, startDate, endDate, data);
      case ReportType.FLEET_UTILIZATION:
        return this.fetchFleetUtilizationData(tenantId, startDate, endDate);
      default:
        throw new BadRequestException('Unknown report type');
    }
  }

  private async fetchBookingsData(tenantId: string, startDate: Date, endDate: Date, data: GenerateReportDto) {
    const where: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (data.status) where.status = data.status;
    if (data.vehicleId) where.vehicleId = data.vehicleId;
    if (data.customerId) where.customerId = data.customerId;

    return this.prisma.booking.findMany({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
        vehicle: { select: { licensePlate: true, brand: true, model: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fetchVehiclesData(tenantId: string, data: GenerateReportDto) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (data.status) where.status = data.status;

    return this.prisma.vehicle.findMany({
      where,
      include: {
        branch: { select: { name: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fetchCustomersData(tenantId: string, data: GenerateReportDto) {
    const where: Record<string, unknown> = { tenantId };
    if (data.status) where.status = data.status;

    return this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fetchRevenueData(tenantId: string, startDate: Date, endDate: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        status: 'CHECKED_IN',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        totalAmount: true,
        discountAmount: true,
        createdAt: true,
        vehicle: { select: { category: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const groupedByDate = bookings.reduce((acc, booking) => {
      const date = format(booking.createdAt, 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { date, totalRevenue: 0, bookingCount: 0, discounts: 0 };
      }
      acc[date].totalRevenue += Number(booking.totalAmount);
      acc[date].discounts += Number(booking.discountAmount);
      acc[date].bookingCount += 1;
      return acc;
    }, {} as Record<string, { date: string; totalRevenue: number; bookingCount: number; discounts: number }>);

    return Object.values(groupedByDate);
  }

  private async fetchMaintenanceData(tenantId: string, startDate: Date, endDate: Date, data: GenerateReportDto) {
    const where: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (data.status) where.status = data.status;
    if (data.vehicleId) where.vehicleId = data.vehicleId;

    return this.prisma.maintenance.findMany({
      where,
      include: {
        vehicle: { select: { licensePlate: true, brand: true, model: true } },
        mechanic: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledFor: 'desc' },
    });
  }

  private async fetchDamagesData(tenantId: string, startDate: Date, endDate: Date, data: GenerateReportDto) {
    const where: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (data.status) where.status = data.status;
    if (data.vehicleId) where.vehicleId = data.vehicleId;

    return this.prisma.damage.findMany({
      where,
      include: {
        vehicle: { select: { licensePlate: true, brand: true, model: true } },
        booking: { select: { id: true, startDate: true, endDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fetchCautionsData(tenantId: string, startDate: Date, endDate: Date, data: GenerateReportDto) {
    const where: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (data.status) where.status = data.status;

    return this.prisma.caution.findMany({
      where,
      include: {
        booking: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            vehicle: { select: { licensePlate: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fetchFleetUtilizationData(tenantId: string, startDate: Date, endDate: Date) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, licensePlate: true, brand: true, model: true, category: true },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'CHECKED_OUT', 'CHECKED_IN'] },
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
        ],
      },
      select: { vehicleId: true, startDate: true, endDate: true },
    });

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return vehicles.map(vehicle => {
      const vehicleBookings = bookings.filter(b => b.vehicleId === vehicle.id);
      const rentedDays = vehicleBookings.reduce((sum, booking) => {
        const start = new Date(Math.max(booking.startDate.getTime(), startDate.getTime()));
        const end = new Date(Math.min(booking.endDate.getTime(), endDate.getTime()));
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, days);
      }, 0);

      return {
        ...vehicle,
        totalDays,
        rentedDays,
        utilizationRate: totalDays > 0 ? Math.round((rentedDays / totalDays) * 100) : 0,
        bookingCount: vehicleBookings.length,
      };
    });
  }

  private async generateExcel(type: ReportType, data: Record<string, unknown>[], tenantId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type);

    // Add headers based on report type
    const columns = this.getColumnsForType(type);
    sheet.columns = columns.map(col => ({ header: col.header, key: col.key, width: col.width || 15 }));

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' },
    };
    sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data
    data.forEach(item => {
      const row = this.transformDataForExcel(type, item);
      sheet.addRow(row);
    });

    // Add auto filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${type}_report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;

    return {
      buffer: Buffer.from(buffer as ArrayBuffer),
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async generateCsv(type: ReportType, data: Record<string, unknown>[], tenantId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const columns = this.getColumnsForType(type);
    const headers = columns.map(col => col.header).join(',');
    
    const rows = data.map(item => {
      const row = this.transformDataForExcel(type, item);
      return columns.map(col => {
        const value = row[col.key];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const filename = `${type}_report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;

    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename,
      mimeType: 'text/csv',
    };
  }

  private async generatePdf(type: ReportType, data: Record<string, unknown>[], tenantId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();
    let y = height - 50;

    // Title
    page.drawText(`${type.toUpperCase()} REPORT`, {
      x: 50,
      y,
      size: 18,
      font: boldFont,
    });
    y -= 20;

    // Date
    page.drawText(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 30;

    // Table headers
    const columns = this.getColumnsForType(type).slice(0, 8); // Limit columns for PDF
    const colWidth = (width - 100) / columns.length;

    columns.forEach((col, i) => {
      page.drawText(col.header, {
        x: 50 + i * colWidth,
        y,
        size: 9,
        font: boldFont,
      });
    });
    y -= 20;

    // Draw line
    page.drawLine({
      start: { x: 50, y: y + 5 },
      end: { x: width - 50, y: y + 5 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Data rows
    for (const item of data) {
      if (y < 50) {
        page = pdfDoc.addPage([842, 595]);
        y = height - 50;
      }

      const row = this.transformDataForExcel(type, item);
      columns.forEach((col, i) => {
        const value = String(row[col.key] ?? '').substring(0, 20);
        page.drawText(value, {
          x: 50 + i * colWidth,
          y,
          size: 8,
          font,
        });
      });
      y -= 15;
    }

    // Footer
    page.drawText(`Total Records: ${data.length}`, {
      x: 50,
      y: 30,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `${type}_report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

    return {
      buffer: Buffer.from(pdfBytes),
      filename,
      mimeType: 'application/pdf',
    };
  }

  private getColumnsForType(type: ReportType): { header: string; key: string; width?: number }[] {
    switch (type) {
      case ReportType.BOOKINGS:
        return [
          { header: 'ID', key: 'id', width: 15 },
          { header: 'Customer', key: 'customer', width: 25 },
          { header: 'Vehicle', key: 'vehicle', width: 20 },
          { header: 'Plate', key: 'plate', width: 12 },
          { header: 'Start Date', key: 'startDate', width: 12 },
          { header: 'End Date', key: 'endDate', width: 12 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Total', key: 'total', width: 12 },
          { header: 'Created', key: 'createdAt', width: 12 },
        ];
      case ReportType.VEHICLES:
        return [
          { header: 'Plate', key: 'licensePlate', width: 12 },
          { header: 'Brand', key: 'brand', width: 15 },
          { header: 'Model', key: 'model', width: 15 },
          { header: 'Year', key: 'year', width: 8 },
          { header: 'Category', key: 'category', width: 12 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Current KM', key: 'currentKm', width: 12 },
          { header: 'Branch', key: 'branch', width: 15 },
          { header: 'Insurance Exp.', key: 'insuranceExpiry', width: 12 },
        ];
      case ReportType.CUSTOMERS:
        return [
          { header: 'Name', key: 'name', width: 25 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Phone', key: 'phone', width: 15 },
          { header: 'License', key: 'licenseNumber', width: 15 },
          { header: 'License Exp.', key: 'licenseExpiry', width: 12 },
          { header: 'Category', key: 'category', width: 12 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Total Bookings', key: 'totalBookings', width: 12 },
          { header: 'Total Spent', key: 'totalSpent', width: 12 },
        ];
      case ReportType.REVENUE:
        return [
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Bookings', key: 'bookingCount', width: 12 },
          { header: 'Revenue', key: 'totalRevenue', width: 15 },
          { header: 'Discounts', key: 'discounts', width: 12 },
        ];
      case ReportType.MAINTENANCE:
        return [
          { header: 'ID', key: 'id', width: 15 },
          { header: 'Vehicle', key: 'vehicle', width: 20 },
          { header: 'Type', key: 'type', width: 12 },
          { header: 'Title', key: 'title', width: 25 },
          { header: 'Priority', key: 'priority', width: 10 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Scheduled', key: 'scheduledFor', width: 12 },
          { header: 'Mechanic', key: 'mechanic', width: 20 },
          { header: 'Cost', key: 'cost', width: 10 },
        ];
      case ReportType.DAMAGES:
        return [
          { header: 'ID', key: 'id', width: 15 },
          { header: 'Vehicle', key: 'vehicle', width: 20 },
          { header: 'Type', key: 'type', width: 12 },
          { header: 'Severity', key: 'severity', width: 12 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Est. Cost', key: 'estimatedCost', width: 12 },
          { header: 'Actual Cost', key: 'actualCost', width: 12 },
          { header: 'Created', key: 'createdAt', width: 12 },
        ];
      case ReportType.CAUTIONS:
        return [
          { header: 'ID', key: 'id', width: 15 },
          { header: 'Customer', key: 'customer', width: 25 },
          { header: 'Vehicle', key: 'vehicle', width: 12 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Payment', key: 'paymentMethod', width: 12 },
          { header: 'Held At', key: 'heldAt', width: 12 },
          { header: 'Released At', key: 'releasedAt', width: 12 },
        ];
      case ReportType.FLEET_UTILIZATION:
        return [
          { header: 'Plate', key: 'licensePlate', width: 12 },
          { header: 'Vehicle', key: 'vehicle', width: 20 },
          { header: 'Category', key: 'category', width: 12 },
          { header: 'Total Days', key: 'totalDays', width: 12 },
          { header: 'Rented Days', key: 'rentedDays', width: 12 },
          { header: 'Utilization %', key: 'utilizationRate', width: 12 },
          { header: 'Bookings', key: 'bookingCount', width: 10 },
        ];
      default:
        return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data comes from Prisma with dynamic includes
  private transformDataForExcel(type: ReportType, item: any): Record<string, unknown> {
    switch (type) {
      case ReportType.BOOKINGS:
        return {
          id: String(item.id ?? '').slice(-8),
          customer: `${item.customer?.firstName ?? ''} ${item.customer?.lastName ?? ''}`.trim(),
          vehicle: `${item.vehicle?.brand ?? ''} ${item.vehicle?.model ?? ''}`.trim(),
          plate: item.vehicle?.licensePlate ?? '-',
          startDate: item.startDate ? format(new Date(item.startDate), 'dd/MM/yyyy') : '-',
          endDate: item.endDate ? format(new Date(item.endDate), 'dd/MM/yyyy') : '-',
          status: item.status,
          total: `€${Number(item.totalAmount || 0).toFixed(2)}`,
          createdAt: item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : '-',
        };
      case ReportType.VEHICLES:
        return {
          licensePlate: item.licensePlate,
          brand: item.brand,
          model: item.model,
          year: item.year,
          category: item.category,
          status: item.status,
          currentKm: item.currentKm,
          branch: item.branch?.name || '-',
          insuranceExpiry: item.insuranceExpiry ? format(new Date(item.insuranceExpiry), 'dd/MM/yyyy') : '-',
        };
      case ReportType.CUSTOMERS:
        return {
          name: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim(),
          email: item.email,
          phone: item.phone,
          licenseNumber: item.licenseNumber,
          licenseExpiry: item.licenseExpiry ? format(new Date(item.licenseExpiry), 'dd/MM/yyyy') : '-',
          category: item.category,
          status: item.status,
          totalBookings: item.totalBookings,
          totalSpent: `€${Number(item.totalSpent || 0).toFixed(2)}`,
        };
      case ReportType.REVENUE:
        return {
          date: item.date,
          bookingCount: item.bookingCount,
          totalRevenue: `€${Number(item.totalRevenue || 0).toFixed(2)}`,
          discounts: `€${Number(item.discounts || 0).toFixed(2)}`,
        };
      case ReportType.MAINTENANCE:
        return {
          id: String(item.id ?? '').slice(-8),
          vehicle: `${item.vehicle?.brand ?? ''} ${item.vehicle?.model ?? ''} (${item.vehicle?.licensePlate ?? ''})`.trim(),
          type: item.type,
          title: item.title,
          priority: item.priority,
          status: item.status,
          scheduledFor: item.scheduledFor ? format(new Date(item.scheduledFor), 'dd/MM/yyyy') : '-',
          mechanic: item.mechanic ? `${item.mechanic.firstName} ${item.mechanic.lastName}` : '-',
          cost: item.cost ? `€${Number(item.cost).toFixed(2)}` : '-',
        };
      case ReportType.DAMAGES:
        return {
          id: String(item.id ?? '').slice(-8),
          vehicle: `${item.vehicle?.brand ?? ''} ${item.vehicle?.model ?? ''} (${item.vehicle?.licensePlate ?? ''})`.trim(),
          type: item.type,
          severity: item.severity,
          status: item.status,
          estimatedCost: `€${Number(item.estimatedCost || 0).toFixed(2)}`,
          actualCost: item.actualCost ? `€${Number(item.actualCost).toFixed(2)}` : '-',
          createdAt: item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : '-',
        };
      case ReportType.CAUTIONS:
        return {
          id: String(item.id ?? '').slice(-8),
          customer: `${item.booking?.customer?.firstName ?? ''} ${item.booking?.customer?.lastName ?? ''}`.trim(),
          vehicle: item.booking?.vehicle?.licensePlate ?? '-',
          amount: `€${Number(item.amount || 0).toFixed(2)}`,
          status: item.status,
          paymentMethod: item.paymentMethod,
          heldAt: item.heldAt ? format(new Date(item.heldAt), 'dd/MM/yyyy') : '-',
          releasedAt: item.releasedAt ? format(new Date(item.releasedAt), 'dd/MM/yyyy') : '-',
        };
      case ReportType.FLEET_UTILIZATION:
        return {
          licensePlate: item.licensePlate,
          vehicle: `${item.brand ?? ''} ${item.model ?? ''}`.trim(),
          category: item.category,
          totalDays: item.totalDays,
          rentedDays: item.rentedDays,
          utilizationRate: `${item.utilizationRate ?? 0}%`,
          bookingCount: item.bookingCount,
        };
      default:
        return item;
    }
  }

  // Get report generation history from audit logs
  async getReportHistory(tenantId: string, filters?: { page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          action: 'GENERATE_REPORT',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          tenantId,
          action: 'GENERATE_REPORT',
        },
      }),
    ]);

    return {
      reports: reports.map((r) => ({
        id: r.id,
        type: (r.newValue as Record<string, unknown>)?.type,
        format: (r.newValue as Record<string, unknown>)?.format,
        rowCount: (r.newValue as Record<string, unknown>)?.rowCount,
        generatedBy: r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Unknown',
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
