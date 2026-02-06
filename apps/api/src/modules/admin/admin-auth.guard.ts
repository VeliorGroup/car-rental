import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token);
      
      // Explicitly check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token expired');
      }
      
      if (payload.type !== 'superadmin') {
        throw new UnauthorizedException('Invalid token type');
      }

      const admin = await this.adminService.validateAdmin(payload.sub);
      if (!admin) {
        throw new UnauthorizedException('Admin not found or inactive');
      }

      request.admin = admin;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
