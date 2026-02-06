import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { AuditService } from '../../common/services/audit.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateFilterDto,
  EmailTemplateType,
} from './dto/email-templates.dto';

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  // Default templates that can be customized
  private readonly defaultTemplates: Record<EmailTemplateType, { subject: string; html: string; variables: Record<string, string> }> = {
    [EmailTemplateType.BOOKING_CONFIRMATION]: {
      subject: 'Booking Confirmation #{{bookingId}}',
      html: `
        <h1>Booking Confirmed!</h1>
        <p>Dear {{customerName}},</p>
        <p>Your booking has been confirmed.</p>
        <table>
          <tr><td>Booking ID:</td><td>{{bookingId}}</td></tr>
          <tr><td>Vehicle:</td><td>{{vehicleName}}</td></tr>
          <tr><td>Pickup:</td><td>{{startDate}}</td></tr>
          <tr><td>Return:</td><td>{{endDate}}</td></tr>
          <tr><td>Total:</td><td>{{totalAmount}}</td></tr>
        </table>
      `,
      variables: {
        customerName: 'Customer full name',
        bookingId: 'Booking reference',
        vehicleName: 'Vehicle brand and model',
        startDate: 'Pickup date',
        endDate: 'Return date',
        totalAmount: 'Total amount',
      },
    },
    [EmailTemplateType.BOOKING_REMINDER]: {
      subject: 'Reminder: Your booking starts tomorrow',
      html: `
        <h1>Booking Reminder</h1>
        <p>Dear {{customerName}},</p>
        <p>This is a reminder that your booking starts tomorrow.</p>
        <p>Vehicle: {{vehicleName}} ({{licensePlate}})</p>
        <p>Pickup: {{startDate}} at {{pickupLocation}}</p>
      `,
      variables: {
        customerName: 'Customer full name',
        vehicleName: 'Vehicle brand and model',
        licensePlate: 'License plate',
        startDate: 'Pickup date and time',
        pickupLocation: 'Pickup location',
      },
    },
    [EmailTemplateType.CHECKOUT_COMPLETE]: {
      subject: 'Vehicle Pickup Complete - Booking #{{bookingId}}',
      html: `
        <h1>Vehicle Pickup Complete</h1>
        <p>Dear {{customerName}},</p>
        <p>Your vehicle pickup has been completed.</p>
        <p>Vehicle: {{vehicleName}} ({{licensePlate}})</p>
        <p>Return by: {{endDate}}</p>
        <p>Caution held: {{cautionAmount}}</p>
      `,
      variables: {
        customerName: 'Customer full name',
        bookingId: 'Booking reference',
        vehicleName: 'Vehicle brand and model',
        licensePlate: 'License plate',
        endDate: 'Return date',
        cautionAmount: 'Caution amount',
      },
    },
    [EmailTemplateType.CHECKIN_COMPLETE]: {
      subject: 'Vehicle Return Complete - Thank You!',
      html: `
        <h1>Thank You!</h1>
        <p>Dear {{customerName}},</p>
        <p>Your vehicle has been successfully returned.</p>
        <p>Caution status: {{cautionStatus}}</p>
        <p>Thank you for choosing us!</p>
      `,
      variables: {
        customerName: 'Customer full name',
        cautionStatus: 'Caution status (released/charged)',
      },
    },
    [EmailTemplateType.BOOKING_CANCELLED]: {
      subject: 'Booking Cancelled - #{{bookingId}}',
      html: `
        <h1>Booking Cancelled</h1>
        <p>Dear {{customerName}},</p>
        <p>Your booking #{{bookingId}} has been cancelled.</p>
        <p>Reason: {{cancellationReason}}</p>
        <p>Refund: {{refundAmount}}</p>
      `,
      variables: {
        customerName: 'Customer full name',
        bookingId: 'Booking reference',
        cancellationReason: 'Cancellation reason',
        refundAmount: 'Refund amount',
      },
    },
    [EmailTemplateType.CAUTION_HELD]: {
      subject: 'Caution Deposit Held - {{amount}}',
      html: `
        <h1>Caution Held</h1>
        <p>Dear {{customerName}},</p>
        <p>A caution deposit of {{amount}} has been held for your booking.</p>
        <p>This will be released upon successful vehicle return.</p>
      `,
      variables: {
        customerName: 'Customer full name',
        amount: 'Caution amount',
      },
    },
    [EmailTemplateType.CAUTION_RELEASED]: {
      subject: 'Caution Deposit Released',
      html: `
        <h1>Caution Released</h1>
        <p>Dear {{customerName}},</p>
        <p>Your caution deposit of {{amount}} has been released.</p>
        <p>Thank you for returning the vehicle in good condition!</p>
      `,
      variables: {
        customerName: 'Customer full name',
        amount: 'Caution amount',
      },
    },
    [EmailTemplateType.CAUTION_CHARGED]: {
      subject: 'Caution Deposit Charged',
      html: `
        <h1>Caution Charged</h1>
        <p>Dear {{customerName}},</p>
        <p>{{chargedAmount}} has been charged from your caution deposit.</p>
        <p>Reason: {{chargeReason}}</p>
      `,
      variables: {
        customerName: 'Customer full name',
        chargedAmount: 'Amount charged',
        chargeReason: 'Reason for charge',
      },
    },
    [EmailTemplateType.DAMAGE_REPORTED]: {
      subject: 'Damage Report - Vehicle {{licensePlate}}',
      html: `
        <h1>Damage Reported</h1>
        <p>A damage has been reported for vehicle {{licensePlate}}.</p>
        <p>Type: {{damageType}}</p>
        <p>Severity: {{severity}}</p>
        <p>Estimated Cost: {{estimatedCost}}</p>
      `,
      variables: {
        licensePlate: 'Vehicle license plate',
        damageType: 'Type of damage',
        severity: 'Damage severity',
        estimatedCost: 'Estimated repair cost',
      },
    },
    [EmailTemplateType.MAINTENANCE_SCHEDULED]: {
      subject: 'Maintenance Scheduled - {{vehicleName}}',
      html: `
        <h1>Maintenance Scheduled</h1>
        <p>Maintenance has been scheduled for {{vehicleName}} ({{licensePlate}}).</p>
        <p>Type: {{maintenanceType}}</p>
        <p>Date: {{scheduledDate}}</p>
      `,
      variables: {
        vehicleName: 'Vehicle brand and model',
        licensePlate: 'License plate',
        maintenanceType: 'Type of maintenance',
        scheduledDate: 'Scheduled date',
      },
    },
    [EmailTemplateType.LICENSE_EXPIRING]: {
      subject: 'License Expiring Soon - Action Required',
      html: `
        <h1>License Expiring</h1>
        <p>Dear {{customerName}},</p>
        <p>Your driver's license is expiring on {{expiryDate}}.</p>
        <p>Please update your license information to continue making bookings.</p>
      `,
      variables: {
        customerName: 'Customer full name',
        expiryDate: 'License expiry date',
      },
    },
    [EmailTemplateType.INSURANCE_EXPIRING]: {
      subject: 'Vehicle Insurance Expiring - {{licensePlate}}',
      html: `
        <h1>Insurance Expiring</h1>
        <p>The insurance for vehicle {{licensePlate}} is expiring on {{expiryDate}}.</p>
        <p>Please renew the insurance to keep the vehicle operational.</p>
      `,
      variables: {
        licensePlate: 'Vehicle license plate',
        expiryDate: 'Insurance expiry date',
      },
    },
    [EmailTemplateType.WELCOME]: {
      subject: 'Welcome to {{companyName}}!',
      html: `
        <h1>Welcome!</h1>
        <p>Dear {{customerName}},</p>
        <p>Welcome to {{companyName}}! Your account has been created.</p>
        <p>You can now browse our fleet and make bookings.</p>
      `,
      variables: {
        customerName: 'Customer full name',
        companyName: 'Company name',
      },
    },
    [EmailTemplateType.PASSWORD_RESET]: {
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="{{resetLink}}">Reset Password</a></p>
        <p>This link expires in {{expiryTime}}.</p>
      `,
      variables: {
        resetLink: 'Password reset link',
        expiryTime: 'Link expiry time',
      },
    },
    [EmailTemplateType.INVOICE]: {
      subject: 'Invoice #{{invoiceNumber}}',
      html: `
        <h1>Invoice</h1>
        <p>Invoice Number: {{invoiceNumber}}</p>
        <p>Amount: {{amount}}</p>
        <p>Due Date: {{dueDate}}</p>
      `,
      variables: {
        invoiceNumber: 'Invoice number',
        amount: 'Invoice amount',
        dueDate: 'Payment due date',
      },
    },
    [EmailTemplateType.CUSTOM]: {
      subject: 'Custom Email',
      html: '<p>Custom email content</p>',
      variables: {},
    },
  };

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, data: CreateEmailTemplateDto, userId: string) {
    const template = await this.prisma.emailTemplate.create({
      data: {
        tenantId,
        type: data.type,
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        variables: data.variables || {},
        isActive: data.isActive ?? true,
      },
    });

    await this.auditService.log(
      tenantId,
      'CREATE_EMAIL_TEMPLATE',
      'EmailTemplate',
      template.id,
      userId,
      null,
      { type: data.type, name: data.name },
    );

    return template;
  }

  async findAll(tenantId: string, filters: EmailTemplateFilterDto) {
    const where: any = { tenantId };

    if (filters.type) where.type = filters.type;
    if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: { type: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return template;
  }

  async findByType(tenantId: string, type: EmailTemplateType) {
    // First try to find custom template
    const customTemplate = await this.prisma.emailTemplate.findFirst({
      where: { tenantId, type, isActive: true },
    });

    if (customTemplate) {
      return customTemplate;
    }

    // Return default template
    const defaultTemplate = this.defaultTemplates[type];
    return {
      id: null,
      type,
      name: `Default ${type}`,
      subject: defaultTemplate.subject,
      htmlContent: defaultTemplate.html,
      textContent: null,
      variables: defaultTemplate.variables,
      isDefault: true,
    };
  }

  async update(tenantId: string, id: string, data: UpdateEmailTemplateDto, userId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    const oldValues = { ...template };

    const updated = await this.prisma.emailTemplate.update({
      where: { id },
      data,
    });

    await this.auditService.log(
      tenantId,
      'UPDATE_EMAIL_TEMPLATE',
      'EmailTemplate',
      id,
      userId,
      oldValues,
      updated,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, userId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    await this.prisma.emailTemplate.delete({ where: { id } });

    await this.auditService.log(
      tenantId,
      'DELETE_EMAIL_TEMPLATE',
      'EmailTemplate',
      id,
      userId,
      template,
      null,
    );
  }

  async preview(tenantId: string, templateId: string, sampleData?: Record<string, any>) {
    const template = await this.findOne(tenantId, templateId);
    
    const data = sampleData || this.generateSampleData(template.variables as Record<string, string>);
    
    return {
      subject: this.renderTemplate(template.subject, data),
      html: this.renderTemplate(template.htmlContent, data),
      text: template.textContent ? this.renderTemplate(template.textContent, data) : null,
    };
  }

  async sendTestEmail(
    tenantId: string,
    templateId: string,
    recipientEmail: string,
    sampleData?: Record<string, any>,
    userId?: string,
  ) {
    const preview = await this.preview(tenantId, templateId, sampleData);

    await this.emailService.sendEmail({
      to: recipientEmail,
      subject: `[TEST] ${preview.subject}`,
      html: preview.html,
      text: preview.text || undefined,
    });

    this.logger.log(`Test email sent to ${recipientEmail} for template ${templateId}`);

    return { success: true, message: `Test email sent to ${recipientEmail}` };
  }

  async getDefaultTemplates() {
    return Object.entries(this.defaultTemplates).map(([type, template]) => ({
      type,
      name: `Default ${type}`,
      subject: template.subject,
      variables: template.variables,
    }));
  }

  renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private generateSampleData(variables: Record<string, string>): Record<string, string> {
    const sampleValues: Record<string, string> = {
      customerName: 'John Doe',
      bookingId: 'BK-123456',
      vehicleName: 'Toyota Corolla',
      licensePlate: 'AB-123-CD',
      startDate: '15/01/2024 10:00',
      endDate: '20/01/2024 10:00',
      totalAmount: '€500.00',
      cautionAmount: '€300.00',
      amount: '€300.00',
      chargedAmount: '€50.00',
      refundAmount: '€450.00',
      companyName: 'FleetPulse',
      expiryDate: '31/12/2024',
      resetLink: 'https://example.com/reset?token=abc123',
      expiryTime: '24 hours',
    };

    return Object.keys(variables).reduce((acc, key) => {
      acc[key] = sampleValues[key] || `[${key}]`;
      return acc;
    }, {} as Record<string, string>);
  }
}
