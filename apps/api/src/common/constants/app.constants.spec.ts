import { getCacheKey, CACHE_KEYS } from './app.constants';

describe('AppConstants', () => {
  describe('getCacheKey', () => {
    it('should generate cache key with tenant namespace', () => {
      const key = getCacheKey(CACHE_KEYS.USER, 'tenant-123', 'user-456');
      expect(key).toBe('user:tenant-123:user-456');
    });

    it('should handle multiple parts', () => {
      const key = getCacheKey(CACHE_KEYS.ANALYTICS, 'tenant-123', '2024', '01');
      expect(key).toBe('analytics:tenant-123:2024:01');
    });

    it('should handle numbers', () => {
      const key = getCacheKey(CACHE_KEYS.BOOKING, 'tenant-123', 12345);
      expect(key).toBe('booking:tenant-123:12345');
    });
  });
});
