import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST');
    
    // Only try to connect to Redis if explicitly configured
    if (!redisUrl && !redisHost) {
      this.logger.log('Redis not configured - using in-memory cache');
      this.isConnected = false;
      return;
    }

    try {
      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      } else {
        this.redis = new Redis({
          host: redisHost,
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD'),
          db: this.configService.get<number>('REDIS_DB', 0),
          retryStrategy: (times) => {
            if (times > 1) {
              return null; // Stop retrying after 1 attempt
            }
            return 500;
          },
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
      }

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully');
      });

      this.redis.on('error', () => {
        // Silent - we'll use fallback cache
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        this.isConnected = false;
      });

      // Try to connect
      await this.redis.connect();
    } catch (error) {
      // Silent - we'll use fallback cache
      this.isConnected = false;
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  // Fallback in-memory cache
  private fallbackCache = new Map<string, { data: string; expiresAt: number }>();

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnected && this.redis) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      }
      
      // Fallback to in-memory
      const entry = this.fallbackCache.get(key);
      if (entry && Date.now() < entry.expiresAt) {
        return JSON.parse(entry.data);
      }
      return null;
    } catch (error) {
      this.logger.error(`Cache get error: ${error}`);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 60): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      
      if (this.isConnected && this.redis) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        // Fallback to in-memory
        this.fallbackCache.set(key, {
          data: serialized,
          expiresAt: Date.now() + (ttlSeconds * 1000),
        });
      }
    } catch (error) {
      this.logger.error(`Cache set error: ${error}`);
    }
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      }
      this.fallbackCache.delete(key);
    } catch (error) {
      this.logger.error(`Cache delete error: ${error}`);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      
      // Also clean fallback
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      for (const key of this.fallbackCache.keys()) {
        if (regex.test(key)) {
          this.fallbackCache.delete(key);
        }
      }
    } catch (error) {
      this.logger.error(`Cache deletePattern error: ${error}`);
    }
  }

  /**
   * Get or compute value - if cached returns cache, otherwise computes and caches
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = 60,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await computeFn();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Acquire a distributed lock using Redis SET NX EX
   * Returns true if lock was acquired, false if already held
   */
  async acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
    const lockKey = `lock:${key}`;
    try {
      if (this.isConnected && this.redis) {
        const result = await this.redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      }
      // Fallback: use in-memory map
      const existing = this.fallbackCache.get(lockKey);
      if (existing && Date.now() < existing.expiresAt) {
        return false; // Already locked
      }
      this.fallbackCache.set(lockKey, {
        data: '1',
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return true;
    } catch (error) {
      this.logger.error(`Lock acquire error for ${key}: ${error}`);
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(lockKey);
      }
      this.fallbackCache.delete(lockKey);
    } catch (error) {
      this.logger.error(`Lock release error for ${key}: ${error}`);
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get cache status
   */
  async getStatus(): Promise<{ connected: boolean; type: 'redis' | 'fallback' }> {
    return {
      connected: this.isConnected,
      type: this.isConnected ? 'redis' : 'fallback',
    };
  }
}
