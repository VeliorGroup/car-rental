import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Public paths that don't require tenant ID
const PUBLIC_PATHS = [
  '/api/v1/auth/countries',
  '/api/v1/auth/login',
  '/api/v1/auth/register-tenant',
  '/api/v1/auth/customer/login',
  '/api/v1/auth/customer/register',
  '/api/v1/subscriptions/plans',
  '/api/v1/search',
  '/api/v1/public',  // All public endpoints (customer auth, public bookings, etc.)
  '/api/v1/admin',   // SuperAdmin endpoints
  '/api/v1/health',
  '/health',
  '/api/docs',
];

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Skip tenant check for public paths
    const isPublicPath = PUBLIC_PATHS.some(path => req.path.startsWith(path));
    if (isPublicPath) {
      return next();
    }

    // Try to extract tenantId from JWT token first (more secure)
    let tenantId: string | undefined;

    // Extract from Authorization header if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = this.jwtService.decode(token) as any;
        
        // Extract tenantId from JWT payload if available
        if (payload?.tenantId) {
          tenantId = payload.tenantId;
        }
      } catch (error) {
        // If token is invalid, continue to header fallback
      }
    }

    // Fallback to header only in development (for testing without auth)
    if (!tenantId) {
      const headerTenantId = req.headers['x-tenant-id'] as string;
      
      // In production, require JWT-based tenantId
      const isDevelopment = this.configService.get('NODE_ENV') === 'development';
      
      if (isDevelopment && headerTenantId) {
        tenantId = headerTenantId;
      } else if (!isDevelopment && !tenantId) {
        throw new UnauthorizedException('Tenant ID must be provided via authenticated JWT token');
      }
    }

    // Validate tenantId format (cuid format)
    if (tenantId && !/^c[a-z0-9]{24}$/.test(tenantId)) {
      throw new UnauthorizedException('Invalid tenant ID format');
    }

    req.tenantId = tenantId;
    next();
  }
}