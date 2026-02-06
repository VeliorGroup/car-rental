import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PgBossModule from 'pg-boss';

const PgBoss = (PgBossModule as any).PgBoss || PgBossModule;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private boss: InstanceType<typeof PgBoss>;
  private readonly logger = new Logger(QueueService.name);
  private isReady = false;
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;

  constructor(private configService: ConfigService) {
    // Use DIRECT_URL for pg-boss as it requires features not supported by pgbouncer
    const connectionString = this.configService.get<string>('DIRECT_URL') || this.configService.get<string>('DATABASE_URL');
    this.boss = new PgBoss({
      connectionString: connectionString!,
      // Disable scheduling for simple queue setup
      noScheduling: true,
    });
    
    this.boss.on('error', (error: any) => {
      // Only log if it's not a known non-critical error
      if (!error?.message?.includes('Queue cache is not initialized')) {
        this.logger.error(error);
      }
    });

    // Create a promise that resolves when boss is ready
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  async onModuleInit() {
    try {
      await this.boss.start();
      this.isReady = true;
      this.resolveReady();
      this.logger.log('PgBoss started and connected to Postgres');
    } catch (e: any) {
      // Log concise error message, not full object
      const errorMessage = e?.message || 'Unknown error';
      this.logger.warn(`PgBoss not available: ${errorMessage}. Job queues disabled.`);
      // Resolve anyway to prevent hanging
      this.resolveReady();
    }
  }

  async onModuleDestroy() {
    if (this.isReady) {
      await this.boss.stop();
    }
  }

  /**
   * Wait for the queue service to be ready
   */
  async waitForReady(): Promise<boolean> {
    await this.readyPromise;
    return this.isReady;
  }

  /**
   * Adds a job to the queue.
   * Emulates BullMQ structure by wrapping data with a job name.
   */
  async add(queue: string, jobName: string, data: any, options?: any) {
    if (!this.isReady) {
      this.logger.warn(`Queue service not ready, skipping job ${jobName} for queue ${queue}`);
      return null;
    }
    return await this.boss.send(queue, { name: jobName, data: data }, options);
  }

  /**
   * Registers a worker implementation for a queue.
   */
  async process(queue: string, handler: (job: { name: string; data: any; id: string }) => Promise<any>) {
    // Wait for boss to be ready before registering workers
    const ready = await this.waitForReady();
    if (!ready) {
      this.logger.warn(`Queue service not ready, skipping worker registration for queue ${queue}`);
      return;
    }

    try {
      // Create the queue first to ensure it exists
      await this.boss.createQueue(queue);
      this.logger.log(`Queue '${queue}' created/verified`);
    } catch (e: any) {
      // Queue might already exist, which is fine
      if (!e?.message?.includes('already exists')) {
        this.logger.warn(`Could not create queue ${queue}: ${e?.message}`);
      }
    }

    await this.boss.work(queue, async (job: any) => {
      const payload = job.data as { name: string; data: any };
      
      const adaptedJob = {
        name: payload.name,
        data: payload.data,
        id: job.id
      };
      
      try {
        await handler(adaptedJob);
      } catch (e) {
        this.logger.error(`Error processing job in queue ${queue}:`, e);
        throw e;
      }
    });
  }
}
