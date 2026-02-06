// Must be first import to suppress verbose library logging before other modules load
import './preload';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { LoggerService } from './common/services/logger.service';
import { validateEnv } from './common/config/env.schema';

async function bootstrap() {
  // Validate environment variables before starting
  validateEnv();
  
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  
  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  
  // Global middleware - Tenant isolation
  const tenantMiddleware = app.get(TenantMiddleware);
  app.use(tenantMiddleware.use.bind(tenantMiddleware));
  
  // Global pipes
  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  
  // CORS - Security: No wildcard default
  const corsOrigins = configService.get<string>('CORS_ORIGIN');
  if (!corsOrigins) {
    throw new Error('CORS_ORIGIN environment variable is required. Cannot use wildcard in production.');
  }
  
  const allowedOrigins = corsOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  
  // Validate origins format
  const originRegex = /^https?:\/\/.+/;
  const invalidOrigins = allowedOrigins.filter(origin => !originRegex.test(origin));
  if (invalidOrigins.length > 0) {
    throw new Error(`Invalid CORS origins format: ${invalidOrigins.join(', ')}`);
  }
  
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });
  
  // Global API prefix
  app.setGlobalPrefix('api/v1');
  
  // Swagger
  const config = new DocumentBuilder()
    .setTitle('FleetPulse API')
    .setDescription('Complete SaaS platform for car rental management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('customers', 'Customer management')
    .addTag('vehicles', 'Vehicle management')
    .addTag('bookings', 'Booking management')
    .addTag('cautions', 'Caution management')
    .addTag('damages', 'Damage management')
    .addTag('maintenance', 'Maintenance management')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('upload', 'File upload')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);
    app.close().then(() => {
      logger.log('Application closed');
      process.exit(0);
    });
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();