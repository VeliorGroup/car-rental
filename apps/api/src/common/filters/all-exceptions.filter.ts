import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { LoggerService } from '../services/logger.service';
import { sanitizeError, sanitizeRequest } from '../utils/sanitize.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Sanitize sensitive data before logging
    const sanitizedRequest = sanitizeRequest(request);
    const sanitizedError = sanitizeError(
      exception instanceof Error ? exception : undefined,
    );

    // Log error with sanitized data
    this.logger.error(
      `Exception: ${JSON.stringify(message)}`,
      JSON.stringify({
        error: sanitizedError,
        request: sanitizedRequest,
        statusCode: httpStatus,
      }),
    );

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage =
      httpStatus === HttpStatus.INTERNAL_SERVER_ERROR && !isDevelopment
        ? 'Internal server error'
        : message;

    response.status(httpStatus).json({
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
      ...(isDevelopment && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    });
  }
}