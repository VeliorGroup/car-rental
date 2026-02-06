import { sanitizeObject, sanitizeString, sanitizeRequest, sanitizeError, isSensitiveField } from './sanitize.util';

describe('SanitizeUtil', () => {
  describe('isSensitiveField', () => {
    it('should identify sensitive fields', () => {
      expect(isSensitiveField('password')).toBe(true);
      expect(isSensitiveField('apiKey')).toBe(true);
      expect(isSensitiveField('authorization')).toBe(true);
      expect(isSensitiveField('email')).toBe(false);
      expect(isSensitiveField('name')).toBe(false);
    });

    it('should match patterns', () => {
      expect(isSensitiveField('userPassword')).toBe(true);
      expect(isSensitiveField('secretToken')).toBe(true);
      expect(isSensitiveField('api_key')).toBe(true);
    });
  });

  describe('sanitizeObject', () => {
    it('should mask sensitive fields', () => {
      const obj = {
        email: 'test@example.com',
        password: 'secret123',
        name: 'John Doe',
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBe('***REDACTED***');
      expect(sanitized.name).toBe('John Doe');
    });

    it('should remove sensitive fields if option set', () => {
      const obj = {
        email: 'test@example.com',
        password: 'secret123',
      };

      const sanitized = sanitizeObject(obj, { remove: true });

      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBeUndefined();
    });

    it('should sanitize nested objects', () => {
      const obj = {
        user: {
          email: 'test@example.com',
          password: 'secret123',
        },
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.user?.email).toBe('test@example.com');
      expect(sanitized.user?.password).toBe('***REDACTED***');
    });
  });

  describe('sanitizeString', () => {
    it('should mask JWT tokens', () => {
      const str = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const sanitized = sanitizeString(str);

      expect(sanitized).toBe('Bearer ***REDACTED***');
    });

    it('should mask query parameters', () => {
      const str = 'https://api.example.com/login?email=test@example.com&password=secret123';
      const sanitized = sanitizeString(str);

      expect(sanitized).toContain('password=***REDACTED***');
    });
  });

  describe('sanitizeRequest', () => {
    it('should sanitize request object', () => {
      const req = {
        method: 'POST',
        url: '/api/auth/login?token=secret',
        headers: {
          authorization: 'Bearer token123',
          'content-type': 'application/json',
        },
        body: {
          email: 'test@example.com',
          password: 'secret123',
        },
        query: {},
        ip: '127.0.0.1',
      };

      const sanitized = sanitizeRequest(req);

      expect(sanitized.method).toBe('POST');
      expect(sanitized.headers.authorization).toBeUndefined();
      expect(sanitized.body.password).toBe('***REDACTED***');
    });
  });

  describe('sanitizeError', () => {
    it('should sanitize error object', () => {
      const error = new Error('Authentication failed');
      error.stack = 'Bearer token123\nat ...';

      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('Authentication failed');
      expect(sanitized.stack).toContain('***REDACTED***');
    });
  });
});
