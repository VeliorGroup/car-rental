import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
  
  toHttpException(): HttpException {
    return new HttpException(
      {
        statusCode: this.statusCode,
        code: this.code,
        message: this.message,
      },
      this.statusCode
    );
  }
}

/**
 * Resource not found (404)
 */
export class NotFoundError extends AppError {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly code = 'NOT_FOUND';
  
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with ID '${id}' not found` : `${resource} not found`);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly code = 'VALIDATION_ERROR';
  
  constructor(message: string) {
    super(message);
  }
}

/**
 * Unauthorized access (401)
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = HttpStatus.UNAUTHORIZED;
  readonly code = 'UNAUTHORIZED';
  
  constructor(message = 'Authentication required') {
    super(message);
  }
}

/**
 * Forbidden access (403)
 */
export class ForbiddenError extends AppError {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly code = 'FORBIDDEN';
  
  constructor(message = 'Access denied') {
    super(message);
  }
}

/**
 * Business logic conflict (409)
 */
export class ConflictError extends AppError {
  readonly statusCode = HttpStatus.CONFLICT;
  readonly code = 'CONFLICT';
  
  constructor(message: string) {
    super(message);
  }
}

/**
 * Tenant inactive error (403)
 */
export class TenantInactiveError extends AppError {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly code = 'TENANT_INACTIVE';
  
  constructor() {
    super('Tenant account is inactive. Please contact support.');
  }
}

/**
 * Subscription limit reached (402)
 */
export class SubscriptionLimitError extends AppError {
  readonly statusCode = HttpStatus.PAYMENT_REQUIRED;
  readonly code = 'SUBSCRIPTION_LIMIT';
  
  constructor(resource: string, limit: number) {
    super(`Subscription limit reached: maximum ${limit} ${resource} allowed. Please upgrade your plan.`);
  }
}

/**
 * Rate limit exceeded (429)
 */
export class RateLimitError extends AppError {
  readonly statusCode = HttpStatus.TOO_MANY_REQUESTS;
  readonly code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message = 'Too many requests. Please try again later.') {
    super(message);
  }
}
