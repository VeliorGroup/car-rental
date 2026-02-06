import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const connectionString = configService.get('DATABASE_URL');
    const pool = new Pool({
      connectionString,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Timeout after 10 seconds if connection cannot be established
    });
    const adapter = new PrismaPg(pool);
    
    // Configure Prisma to only log warnings and errors
    super({ 
      adapter,
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });
    
    this.pool = pool;
    
    // Setup query timeout handler
    this.setupQueryTimeout();
  }

  private setupQueryTimeout() {
    // Listen for slow queries (warnings)
    // Note: Prisma query events are available but need proper typing
    try {
      (this as any).$on('query' as any, (e: any) => {
        if (e.duration > 1000) {
          // Log queries taking more than 1 second
          this.logger.warn(
            `Slow query detected: ${e.duration}ms - ${e.query?.substring(0, 100) || 'N/A'}`,
          );
        }
      });
    } catch (error) {
      // Query events might not be available in all Prisma versions
      this.logger.debug('Query event listener not available');
    }
  }

  async onModuleInit() {
    await this.$connect();
    // Note: Metrics will use standard Postgres tables
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  // Multi-tenant query helper
  async findManyWithTenant<T>(model: string, tenantId: string, args: any = {}) {
    return (this as any)[model].findMany({
      ...args,
      where: {
        ...args.where,
        tenantId,
      },
    });
  }

  // Multi-tenant create helper
  async createWithTenant<T>(model: string, tenantId: string, data: any) {
    return (this as any)[model].create({
      data: {
        ...data,
        tenantId,
      },
    });
  }
}