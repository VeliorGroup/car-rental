import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
// BullModule removed
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottleCustomGuard } from './common/guards/throttle-custom.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CautionsModule } from './modules/cautions/cautions.module';
import { DamagesModule } from './modules/damages/damages.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TiresModule } from './modules/tires/tires.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { UploadModule } from './modules/upload/upload.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PublicAuthModule } from './modules/public-auth/public-auth.module';
import { SearchModule } from './modules/search/search.module';
import { PublicBookingsModule } from './modules/public-bookings/public-bookings.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { FuelLogsModule } from './modules/fuel-logs/fuel-logs.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { CommonModule } from './common/common.module';
import { QueueModule } from './common/queue/queue.module';
import { LoggerService } from './common/services/logger.service';
import { MetricsService } from './common/services/metrics.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppController } from './app.controller';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    // BullModule removed
    QueueModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    CustomersModule,
    VehiclesModule,
    BookingsModule,
    PaymentsModule,
    CautionsModule,
    DamagesModule,
    MaintenanceModule,
    TiresModule,
    AnalyticsModule,
    UploadModule,
    SubscriptionModule,
    UsersModule,
    BranchesModule,
    TenantsModule,
    AdminModule,
    NotificationsModule,
    PublicAuthModule,
    SearchModule,
    PublicBookingsModule,
    PayoutsModule,
    ReportsModule,
    DocumentsModule,
    EmailTemplatesModule,
    ApiKeysModule,
    FuelLogsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    LoggerService,
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottleCustomGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}