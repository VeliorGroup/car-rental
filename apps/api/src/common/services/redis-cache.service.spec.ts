import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisCacheService', () => {
  // ================================================================
  // With Redis connected
  // ================================================================
  describe('with Redis connected', () => {
    let service: RedisCacheService;
    let mockRedis: jest.Mocked<Redis>;

    beforeEach(async () => {
      mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        keys: jest.fn(),
        connect: jest.fn(),
        quit: jest.fn(),
        on: jest.fn((event: string, cb: (...args: any[]) => void) => {
          if (event === 'connect') cb();
          return mockRedis;
        }),
      } as any;

      (Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisCacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'REDIS_URL') return 'redis://localhost:6379';
                return null;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<RedisCacheService>(RedisCacheService);
      await service.onModuleInit();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should report as connected', () => {
      expect(service.isRedisConnected()).toBe(true);
    });

    // ── get ─────────────────────────────────────────────────────
    describe('get', () => {
      it('should return cached value from Redis', async () => {
        const testData = { id: 'test', name: 'Test' };
        (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(testData));

        const result = await service.get('test-key');

        expect(result).toEqual(testData);
        expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null if key not found', async () => {
        (mockRedis.get as jest.Mock).mockResolvedValue(null);

        const result = await service.get('non-existent-key');

        expect(result).toBeNull();
      });

      it('should return null on Redis error', async () => {
        (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Connection lost'));

        const result = await service.get('test-key');

        expect(result).toBeNull();
      });
    });

    // ── set ─────────────────────────────────────────────────────
    describe('set', () => {
      it('should set value in Redis with TTL', async () => {
        const testData = { id: 'test', name: 'Test' };
        (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

        await service.set('test-key', testData, 60);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test-key',
          60,
          JSON.stringify(testData),
        );
      });

      it('should use default TTL of 60 seconds', async () => {
        (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

        await service.set('test-key', { value: 1 });

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test-key',
          60,
          expect.any(String),
        );
      });

      it('should swallow Redis errors gracefully', async () => {
        (mockRedis.setex as jest.Mock).mockRejectedValue(new Error('Write error'));

        // Should not throw
        await expect(service.set('test-key', 'data')).resolves.toBeUndefined();
      });
    });

    // ── delete ──────────────────────────────────────────────────
    describe('delete', () => {
      it('should delete key from Redis', async () => {
        (mockRedis.del as jest.Mock).mockResolvedValue(1);

        await service.delete('test-key');

        expect(mockRedis.del).toHaveBeenCalledWith('test-key');
      });

      it('should swallow errors on delete', async () => {
        (mockRedis.del as jest.Mock).mockRejectedValue(new Error('Delete error'));

        await expect(service.delete('test-key')).resolves.toBeUndefined();
      });
    });

    // ── deletePattern ───────────────────────────────────────────
    describe('deletePattern', () => {
      it('should delete all keys matching pattern', async () => {
        (mockRedis.keys as jest.Mock).mockResolvedValue(['key:1', 'key:2', 'key:3']);
        (mockRedis.del as jest.Mock).mockResolvedValue(3);

        await service.deletePattern('key:*');

        expect(mockRedis.keys).toHaveBeenCalledWith('key:*');
        expect(mockRedis.del).toHaveBeenCalledWith('key:1', 'key:2', 'key:3');
      });

      it('should do nothing if no keys match pattern', async () => {
        (mockRedis.keys as jest.Mock).mockResolvedValue([]);

        await service.deletePattern('nonexistent:*');

        expect(mockRedis.del).not.toHaveBeenCalled();
      });

      it('should swallow errors on deletePattern', async () => {
        (mockRedis.keys as jest.Mock).mockRejectedValue(new Error('KEYS error'));

        await expect(service.deletePattern('key:*')).resolves.toBeUndefined();
      });
    });

    // ── getOrCompute ────────────────────────────────────────────
    describe('getOrCompute', () => {
      it('should return cached value if available and not call compute', async () => {
        const cachedData = { id: 'cached' };
        (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

        const computeFn = jest.fn();

        const result = await service.getOrCompute('test-key', computeFn, 60);

        expect(result).toEqual(cachedData);
        expect(computeFn).not.toHaveBeenCalled();
      });

      it('should compute, cache, and return value if not cached', async () => {
        const computedData = { id: 'computed' };
        (mockRedis.get as jest.Mock).mockResolvedValue(null);
        (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

        const computeFn = jest.fn().mockResolvedValue(computedData);

        const result = await service.getOrCompute('test-key', computeFn, 120);

        expect(result).toEqual(computedData);
        expect(computeFn).toHaveBeenCalledTimes(1);
        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test-key',
          120,
          JSON.stringify(computedData),
        );
      });
    });

    // ── acquireLock ─────────────────────────────────────────────
    describe('acquireLock', () => {
      it('should acquire lock successfully when key is free', async () => {
        (mockRedis.set as jest.Mock).mockResolvedValue('OK');

        const result = await service.acquireLock('resource:1', 10);

        expect(result).toBe(true);
        expect(mockRedis.set).toHaveBeenCalledWith(
          'lock:resource:1',
          '1',
          'EX',
          10,
          'NX',
        );
      });

      it('should fail to acquire lock when already held', async () => {
        (mockRedis.set as jest.Mock).mockResolvedValue(null);

        const result = await service.acquireLock('resource:1', 10);

        expect(result).toBe(false);
      });

      it('should return false on Redis error', async () => {
        (mockRedis.set as jest.Mock).mockRejectedValue(new Error('Redis down'));

        const result = await service.acquireLock('resource:1', 10);

        expect(result).toBe(false);
      });

      it('should use default TTL of 10 seconds', async () => {
        (mockRedis.set as jest.Mock).mockResolvedValue('OK');

        await service.acquireLock('resource:1');

        expect(mockRedis.set).toHaveBeenCalledWith(
          'lock:resource:1',
          '1',
          'EX',
          10,
          'NX',
        );
      });
    });

    // ── releaseLock ─────────────────────────────────────────────
    describe('releaseLock', () => {
      it('should release lock by deleting key', async () => {
        (mockRedis.del as jest.Mock).mockResolvedValue(1);

        await service.releaseLock('resource:1');

        expect(mockRedis.del).toHaveBeenCalledWith('lock:resource:1');
      });

      it('should swallow errors on release', async () => {
        (mockRedis.del as jest.Mock).mockRejectedValue(new Error('Redis down'));

        await expect(service.releaseLock('resource:1')).resolves.toBeUndefined();
      });
    });

    // ── getStatus ───────────────────────────────────────────────
    describe('getStatus', () => {
      it('should return connected redis status', async () => {
        const status = await service.getStatus();

        expect(status).toEqual({
          connected: true,
          type: 'redis',
        });
      });
    });
  });

  // ================================================================
  // With fallback mode (no Redis configured)
  // ================================================================
  describe('with fallback mode (no Redis)', () => {
    let service: RedisCacheService;

    beforeEach(async () => {
      // Reset the ioredis mock to avoid side effects
      (Redis as unknown as jest.Mock).mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisCacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null), // No REDIS_URL, no REDIS_HOST
            },
          },
        ],
      }).compile();

      service = module.get<RedisCacheService>(RedisCacheService);
      await service.onModuleInit();
    });

    it('should report as not connected', () => {
      expect(service.isRedisConnected()).toBe(false);
    });

    it('should return fallback status', async () => {
      const status = await service.getStatus();

      expect(status).toEqual({
        connected: false,
        type: 'fallback',
      });
    });

    // ── Fallback get/set/delete ─────────────────────────────────
    describe('get', () => {
      it('should return value from in-memory fallback cache', async () => {
        const testData = { id: 'inmem' };
        await service.set('fb-key', testData, 60);

        const result = await service.get('fb-key');

        expect(result).toEqual(testData);
      });

      it('should return null for expired entries', async () => {
        // Set with 0 seconds TTL → immediately expired
        await service.set('expired-key', { data: 'old' }, 0);

        // Wait a tick for the expiry
        await new Promise((r) => setTimeout(r, 5));

        const result = await service.get('expired-key');

        expect(result).toBeNull();
      });

      it('should return null for non-existent key', async () => {
        const result = await service.get('doesnt-exist');

        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should store data in in-memory cache', async () => {
        await service.set('mem-key', { value: 42 }, 300);

        const result = await service.get('mem-key');

        expect(result).toEqual({ value: 42 });
      });
    });

    describe('delete', () => {
      it('should remove key from in-memory cache', async () => {
        await service.set('del-key', 'value', 300);
        await service.delete('del-key');

        const result = await service.get('del-key');

        expect(result).toBeNull();
      });
    });

    describe('deletePattern', () => {
      it('should delete matching keys from fallback cache', async () => {
        await service.set('prefix:a', 'val-a', 300);
        await service.set('prefix:b', 'val-b', 300);
        await service.set('other:c', 'val-c', 300);

        await service.deletePattern('prefix:*');

        expect(await service.get('prefix:a')).toBeNull();
        expect(await service.get('prefix:b')).toBeNull();
        expect(await service.get('other:c')).toEqual('val-c');
      });
    });

    // ── Fallback getOrCompute ───────────────────────────────────
    describe('getOrCompute', () => {
      it('should compute and cache in fallback on first call', async () => {
        const computeFn = jest.fn().mockResolvedValue({ computed: true });

        const result = await service.getOrCompute('compute-key', computeFn, 60);

        expect(result).toEqual({ computed: true });
        expect(computeFn).toHaveBeenCalledTimes(1);
      });

      it('should return cached value on second call', async () => {
        const computeFn = jest.fn().mockResolvedValue({ computed: true });

        await service.getOrCompute('compute-key', computeFn, 60);
        const result = await service.getOrCompute('compute-key', computeFn, 60);

        expect(result).toEqual({ computed: true });
        expect(computeFn).toHaveBeenCalledTimes(1); // Not called again
      });
    });

    // ── Fallback acquireLock / releaseLock ───────────────────────
    describe('acquireLock', () => {
      it('should acquire lock using in-memory fallback', async () => {
        const result = await service.acquireLock('my-resource', 10);

        expect(result).toBe(true);
      });

      it('should fail to acquire if already locked in fallback', async () => {
        await service.acquireLock('my-resource', 10);

        const result = await service.acquireLock('my-resource', 10);

        expect(result).toBe(false);
      });

      it('should allow re-acquire after lock expires in fallback', async () => {
        // Lock with 0 seconds TTL → immediately expired
        await service.acquireLock('exp-resource', 0);
        await new Promise((r) => setTimeout(r, 5));

        const result = await service.acquireLock('exp-resource', 10);

        expect(result).toBe(true);
      });
    });

    describe('releaseLock', () => {
      it('should release lock from fallback cache', async () => {
        await service.acquireLock('rel-resource', 10);
        await service.releaseLock('rel-resource');

        // Should be able to acquire again
        const result = await service.acquireLock('rel-resource', 10);

        expect(result).toBe(true);
      });
    });
  });
});
