import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto } from './dto/create-customer.dto';
import { Customer, CustomerCategory, CustomerStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, data: CreateCustomerDto, files: any, userId: string): Promise<Customer> {
    // Check if customer exists
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [
          { email: data.email },
          { licenseNumber: data.licenseNumber },
        ],
      },
    });

    if (existingCustomer) {
      throw new BadRequestException('Customer with this email or license number already exists');
    }

    // Upload documents
    const documentKeys: any = {};
    if (files?.licenseFront) {
      documentKeys.licenseFrontKey = await this.storageService.uploadResizedImage(
        files.licenseFront,
        `customers/${tenantId}/licenses`,
        1200,
        800,
      );
    }
    if (files?.licenseBack) {
      documentKeys.licenseBackKey = await this.storageService.uploadResizedImage(
        files.licenseBack,
        `customers/${tenantId}/licenses`,
        1200,
        800,
      );
    }
    if (files?.idCardFront) {
      documentKeys.idCardFrontKey = await this.storageService.uploadResizedImage(
        files.idCardFront,
        `customers/${tenantId}/id-cards`,
        1200,
        800,
      );
    }
    if (files?.idCardBack) {
      documentKeys.idCardBackKey = await this.storageService.uploadResizedImage(
        files.idCardBack,
        `customers/${tenantId}/id-cards`,
        1200,
        800,
      );
    }

    // Calculate discount based on category
    const discountPercentage = this.calculateDiscount(data.category || CustomerCategory.STANDARD);

    try {
      const customer = await this.prisma.customer.create({
        data: {
          ...data,
          dateOfBirth: new Date(data.dateOfBirth),
          licenseExpiry: new Date(data.licenseExpiry),
          tenantId,
          ...documentKeys,
          discountPercentage,
        },
      });

      // Audit log
      await this.auditService.log(tenantId, 'CREATE_CUSTOMER', 'Customer', customer.id, userId, null, customer);

      return customer;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      // Log error to audit (fire-and-forget with proper error handling)
      this.auditService.log(tenantId, 'CREATE_CUSTOMER_ERROR', 'Customer', '', userId, { error: errorMsg }, null)
        .catch((auditErr) => this.logger.error(`Failed to log audit for customer creation error: ${auditErr}`));
      this.logger.error(`Error creating customer for tenant ${tenantId}: ${errorMsg}`);
      throw error;
    }
  }

  async findAll(tenantId: string, filters: CustomerFilterDto): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { licenseNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.licenseExpiryFrom || filters.licenseExpiryTo) {
      where.licenseExpiry = {};
      if (filters.licenseExpiryFrom) where.licenseExpiry.gte = new Date(filters.licenseExpiryFrom);
      if (filters.licenseExpiryTo) where.licenseExpiry.lte = new Date(filters.licenseExpiryTo);
    }

    const orderBy = { [filters.sortBy || 'createdAt']: filters.order || 'desc' };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateCustomerDto,
    files: any,
    userId: string,
  ): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if trying to set status to INACTIVE/BLOCKED with active bookings
    if (data.status && data.status !== CustomerStatus.ACTIVE) {
      const activeBookings = await this.prisma.booking.count({
        where: {
          customerId: id,
          status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
        },
      });

      if (activeBookings > 0) {
        throw new BadRequestException(`Cannot set customer to ${data.status} with ${activeBookings} active bookings`);
      }
    }

    // Store old values for audit
    const oldValues = { ...customer };

    // Handle file uploads
    const documentKeys: any = {};

    if (files?.licenseFront) {
      if (customer.licenseFrontKey) {
        await this.storageService.deleteFile(customer.licenseFrontKey);
      }
      documentKeys.licenseFrontKey = await this.storageService.uploadResizedImage(
        files.licenseFront,
        `customers/${tenantId}/licenses`,
        1200,
        800,
      );
    }

    if (files?.licenseBack) {
      if (customer.licenseBackKey) {
        await this.storageService.deleteFile(customer.licenseBackKey);
      }
      documentKeys.licenseBackKey = await this.storageService.uploadResizedImage(
        files.licenseBack,
        `customers/${tenantId}/licenses`,
        1200,
        800,
      );
    }

    if (files?.idCardFront) {
      if (customer.idCardFrontKey) {
        await this.storageService.deleteFile(customer.idCardFrontKey);
      }
      documentKeys.idCardFrontKey = await this.storageService.uploadResizedImage(
        files.idCardFront,
        `customers/${tenantId}/id-cards`,
        1200,
        800,
      );
    }

    if (files?.idCardBack) {
      if (customer.idCardBackKey) {
        await this.storageService.deleteFile(customer.idCardBackKey);
      }
      documentKeys.idCardBackKey = await this.storageService.uploadResizedImage(
        files.idCardBack,
        `customers/${tenantId}/id-cards`,
        1200,
        800,
      );
    }

    // Recalculate discount if category changed
    const updateData: any = { ...data };
    if (data.category) {
      updateData.discountPercentage = this.calculateDiscount(data.category);
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...updateData,
        ...documentKeys,
      },
    });

    // Audit log
    await this.auditService.log(tenantId, 'UPDATE_CUSTOMER', 'Customer', id, userId, oldValues, updatedCustomer);

    return updatedCustomer;
  }

  async remove(tenantId: string, id: string, userId: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if customer has active bookings
    const activeBookings = await this.prisma.booking.count({
      where: {
        customerId: id,
        status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException('Cannot delete customer with active bookings');
    }

    // Check for future bookings
    const futureBookings = await this.prisma.booking.count({
      where: {
        customerId: id,
        status: 'CONFIRMED',
        startDate: { gt: new Date() },
      },
    });

    if (futureBookings > 0) {
      throw new BadRequestException(`Cannot delete customer with ${futureBookings} future bookings`);
    }

    // Delete files
    if (customer.licenseFrontKey) await this.storageService.deleteFile(customer.licenseFrontKey);
    if (customer.licenseBackKey) await this.storageService.deleteFile(customer.licenseBackKey);
    if (customer.idCardFrontKey) await this.storageService.deleteFile(customer.idCardFrontKey);
    if (customer.idCardBackKey) await this.storageService.deleteFile(customer.idCardBackKey);

    await this.prisma.customer.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log(tenantId, 'DELETE_CUSTOMER', 'Customer', id, userId, customer, null);
  }

  async getCustomerBookings(tenantId: string, id: string): Promise<any[]> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.booking.findMany({
      where: { customerId: id, tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
      },
    });
  }

  private calculateDiscount(category: CustomerCategory): number {
    switch (category) {
      case CustomerCategory.PREMIUM:
        return 15;
      case CustomerCategory.BUSINESS:
        return 10;
      case CustomerCategory.STANDARD:
      default:
        return 0;
    }
  }

  async exportCustomers(tenantId: string): Promise<Buffer> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Customers');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'License Number', key: 'licenseNumber', width: 20 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    customers.forEach((customer) => {
      worksheet.addRow({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        licenseNumber: customer.licenseNumber,
        category: customer.category,
        status: customer.status,
        city: customer.city,
        createdAt: customer.createdAt,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importCustomers(tenantId: string, fileBuffer: Buffer, userId: string): Promise<{ count: number; errors: any[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Invalid Excel file');
    }

    const customersToCreate: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      licenseNumber: string;
      licenseExpiry: Date;
      dateOfBirth: Date;
      address: string;
      city: string;
      country: string;
      zipCode: string;
      category: CustomerCategory;
      status: CustomerStatus;
      tenantId: string;
      discountPercentage: number;
    }> = [];
    const errors: Array<{ row?: number; email?: string; error: string }> = [];
    let rowNumber = 1;

    // Iterate starting from row 2 (header is 1)
    worksheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // Skip header

      const getCellValue = (index: number) => {
        const cell = row.getCell(index);
        return cell.value ? cell.value.toString() : '';
      };
      
      // Mapping based on assumed column order: 
      // 1: FirstName, 2: LastName, 3: Email, 4: Phone, 5: LicenseNumber, 6: Category...
      // OR better, we try to match headers. But for simplicity, let's assume a template.
      // Let's rely on column indices 1-based.
      
      // Assumed Template: 
      // FirstName | LastName | Email | Phone | LicenseNumber | LicenseExpiry | DateOfBirth | Address | City | Country | ZipCode
      
      const email = getCellValue(3);
      if (!email) {
        errors.push({ row: rowNum, error: 'Email is required' });
        return;
      }

      customersToCreate.push({
        firstName: getCellValue(1),
        lastName: getCellValue(2),
        email: email,
        phone: getCellValue(4),
        licenseNumber: getCellValue(5),
        licenseExpiry: getCellValue(6) ? new Date(getCellValue(6)) : new Date(), // Fallback or strict?
        dateOfBirth: getCellValue(7) ? new Date(getCellValue(7)) : new Date(),
        address: getCellValue(8),
        city: getCellValue(9),
        country: getCellValue(10) || 'Albania',
        zipCode: getCellValue(11),
        category: (getCellValue(12) as CustomerCategory) || CustomerCategory.STANDARD,
        status: CustomerStatus.ACTIVE,
        tenantId: tenantId,
        discountPercentage: 0 // Will recalc
      });
    });

    let successCount = 0;

    for (const data of customersToCreate) {
      try {
        // Basic check duplication
        const exists = await this.prisma.customer.findFirst({
            where: { tenantId, OR: [{ email: data.email }, { licenseNumber: data.licenseNumber }] }
        });

        if (exists) {
            errors.push({ email: data.email, error: 'Customer already exists' });
            continue;
        }

        data.discountPercentage = this.calculateDiscount(data.category);

        await this.prisma.customer.create({ data });
        successCount++;
        
         // Audit (bulk import logging might be noisy, maybe log summary?)
         // For now, let's skip individual logs for bulk or log minimal
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ email: data.email, error: errMsg });
      }
    }
    
    await this.auditService.log(tenantId, 'IMPORT_CUSTOMERS', 'Customer', '', userId, { count: successCount, errors }, null);

    return { count: successCount, errors };
  }

  async getStatsSummary(tenantId: string, search?: string): Promise<any> {
    const where: any = { tenantId };
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, byStatus, byCategory] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.customer.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
      }),
    ]);

    const statusMap = byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

    const categoryMap = byCategory.reduce((acc, curr) => {
      acc[curr.category] = curr._count.category;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      status: statusMap,
      category: categoryMap,
    };
  }
}
