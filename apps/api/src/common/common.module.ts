import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerService } from './services/logger.service';

import { MetricsService } from './services/metrics.service';
import { StorageService } from './services/storage.service';
import { PdfService } from './services/pdf.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PayseraService } from './services/paysera.service';
import { EncryptionService } from './services/encryption.service';
import { AuditService } from './services/audit.service';
import { CacheService } from './services/cache.service';
import { RedisCacheService } from './services/redis-cache.service';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { CacheInvalidationService } from './utils/cache-invalidation.util';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    LoggerService,
    MetricsService,
    StorageService,
    PdfService,
    EmailService,
    SmsService,
    PayseraService,
    EncryptionService,
    AuditService,
    CacheService,
    RedisCacheService,
    TenantMiddleware,
    CacheInvalidationService,
  ],
  exports: [
    LoggerService,
    MetricsService,
    StorageService,
    PdfService,
    EmailService,
    SmsService,
    PayseraService,
    EncryptionService,
    AuditService,
    CacheService,
    RedisCacheService,
    TenantMiddleware,
    CacheInvalidationService,
  ],
})
export class CommonModule {}
