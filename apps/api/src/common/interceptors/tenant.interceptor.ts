import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Attach tenant object to request from JWT user
    if (request.user && request.user.tenantId) {
      request.tenant = { id: request.user.tenantId };
    }
    
    return next.handle();
  }
}
