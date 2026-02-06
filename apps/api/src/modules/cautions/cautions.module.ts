import { Module } from '@nestjs/common';
import { CautionsController } from './cautions.controller';
import { CautionsService } from './cautions.service';

import { PayseraService } from '../../common/services/paysera.service';
import { PdfService } from '../../common/services/pdf.service';
import { EmailService } from '../../common/services/email.service';

import { MetricsService } from '../../common/services/metrics.service';
import { AuditService } from '../../common/services/audit.service';

@Module({
  imports: [

  ],
  controllers: [CautionsController],
  providers: [
    CautionsService,
    PayseraService,
    PdfService,
    EmailService,

    MetricsService,
    AuditService,
  ],
  exports: [CautionsService],
})
export class CautionsModule {}