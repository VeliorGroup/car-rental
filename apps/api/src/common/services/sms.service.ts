import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) { }

  async sendSms(to: string, content: string, tenantId?: string): Promise<void> {
    // In production, this would use Twilio or another provider
    this.logger.log(`[${tenantId || 'default'}] Sending SMS to ${to}`);
    this.logger.debug(`Content: ${content}`);
  }
}