import { validateEnv, envSchema } from './env.schema';

describe('EnvSchema', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should validate required environment variables', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-min-16-chars';
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw error if DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'test-secret-min-16-chars';
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    expect(() => validateEnv()).toThrow();
  });

  it('should throw error if JWT_SECRET is too short', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.JWT_SECRET = 'short';
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    expect(() => validateEnv()).toThrow();
  });

  it('should throw error if CORS_ORIGIN is missing', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-min-16-chars';
    delete process.env.CORS_ORIGIN;

    expect(() => validateEnv()).toThrow();
  });

  it('should accept valid optional environment variables', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-min-16-chars';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.MINIO_ENDPOINT = 'localhost';

    expect(() => validateEnv()).not.toThrow();
  });

  it('should validate NODE_ENV enum', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-min-16-chars';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.NODE_ENV = 'invalid';

    expect(() => validateEnv()).toThrow();
  });
});
