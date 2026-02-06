import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueueService } from '../../../common/queue/queue.service';
import { EmailService } from '../../../common/services/email.service';
import { SmsService } from '../../../common/services/sms.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LicenseExpiryProcessor implements OnModuleInit {
    private readonly logger = new Logger(LicenseExpiryProcessor.name);

    constructor(
        private readonly queueService: QueueService,
        private readonly emailService: EmailService,
        private readonly smsService: SmsService,
        private readonly prisma: PrismaService,
    ) {}

    async onModuleInit() {
        await this.queueService.process('license-expiry', this.process.bind(this));
    }

    async process(job: { name: string; data: any; id: string }): Promise<any> {
        this.logger.log(`Processing job ${job.name} for customer ${job.data.customerId}`);

        switch (job.name) {
            case 'send-reminder':
                return this.handleSendReminder(job.data);
            case 'license-expired':
                return this.handleLicenseExpired(job.data);
            default:
                throw new Error(`Unknown job name: ${job.name}`);
        }
    }

    private async handleSendReminder(data: { customerId: string; tenantId: string; daysBefore: number; expiryDate: string }) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: data.customerId },
        });

        if (!customer) return;

        // Send Email
        await this.emailService.sendTemplateEmail(
            customer.email,
            'license-reminder',
            {
                firstName: customer.firstName,
                daysBefore: data.daysBefore,
                expiryDate: new Date(data.expiryDate).toLocaleDateString(),
            },
            data.tenantId,
        );

        // Send SMS if 7 days before
        if (data.daysBefore === 7 && customer.phone) {
            await this.smsService.sendSms(
                customer.phone,
                `Your license expires on ${new Date(data.expiryDate).toLocaleDateString()}. Please upload a new one.`,
                data.tenantId,
            );
        }
    }

    private async handleLicenseExpired(data: { customerId: string; tenantId: string }) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: data.customerId },
        });

        if (!customer) return;

        await this.emailService.sendTemplateEmail(
            customer.email,
            'license-expired-notification',
            {
                firstName: customer.firstName,
            },
            data.tenantId,
        );
    }
}
