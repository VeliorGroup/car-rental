import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) { }

  async log(
    tenantId: string,
    action: string,
    resource: string,
    resourceId: string,
    userId: string,
    oldValue?: any,
    newValue?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action,
          resource,
          resourceId,
          userId,
          oldValue: oldValue || undefined,
          newValue: newValue || undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
    }
  }
}