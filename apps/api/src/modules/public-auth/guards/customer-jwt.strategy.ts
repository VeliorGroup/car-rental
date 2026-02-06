import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CustomerJwtPayload {
  sub: string; // Customer ID
  email: string;
  type: 'customer';
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: CustomerJwtPayload) {
    if (payload.type !== 'customer') {
      return null;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isVerified: true,
        deletedAt: true,
      },
    });

    if (!customer || customer.deletedAt) {
      return null;
    }

    return customer;
  }
}
