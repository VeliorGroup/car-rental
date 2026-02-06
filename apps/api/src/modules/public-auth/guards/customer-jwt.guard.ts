import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerJwtGuard extends AuthGuard('customer-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, customer: any) {
    if (err || !customer) {
      throw err || new UnauthorizedException('Invalid customer token');
    }
    return customer;
  }
}
