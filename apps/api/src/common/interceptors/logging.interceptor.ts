import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { sanitizeString } from '../utils/sanitize.util';

/**
 * Logging interceptor for request/response tracking
 * Logs method, URL, duration, and status code for all requests
 * Sanitizes sensitive data from URLs and logs
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const tenantId = request.user?.tenantId || 'anonymous';
    
    // Sanitize URL to remove sensitive query params
    const sanitizedUrl = sanitizeString(url);
    
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - startTime;
          
          this.logger.log(
            `${method} ${sanitizedUrl} ${statusCode} ${duration}ms - tenant:${tenantId} - ${ip} - ${userAgent.substring(0, 50)}`
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          const sanitizedMessage = sanitizeString(error.message || 'Unknown error');
          
          this.logger.error(
            `${method} ${sanitizedUrl} ${statusCode} ${duration}ms - tenant:${tenantId} - ${ip} - ${sanitizedMessage}`
          );
        },
      })
    );
  }
}
