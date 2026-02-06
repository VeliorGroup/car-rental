import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get a value from cache
   * @returns The cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set a value in cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlSeconds Time to live in seconds (default: 60)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern (e.g., "dashboard:*")
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    // Clean expired entries first
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Helper: Get or compute value
   * If cached, returns cache. Otherwise computes, caches, and returns.
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = 60,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await computeFn();
    this.set(key, data, ttlSeconds);
    return data;
  }
}
