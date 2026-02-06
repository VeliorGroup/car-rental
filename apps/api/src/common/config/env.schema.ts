import { z } from 'zod';

/**
 * Environment variable schema validation
 * Validates all required environment variables at application startup
 */
export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRATION: z.string().default('1d'),
  
  // Server
  PORT: z.string().transform(Number).default('3001' as unknown as number),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Paysera (optional)
  PAYSERA_PROJECT_ID: z.string().optional(),
  PAYSERA_SIGN_PASSWORD: z.string().optional(),
  
  // Storage (optional)
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
}).passthrough(); // Allow system environment variables

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables and throw descriptive errors
 */
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `  - ${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      
      throw new Error(
        `Environment validation failed:\n${issues}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
}
