import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisCacheService } from '../../../common/services/redis-cache.service';
import { CACHE_TTL, CACHE_KEYS, getCacheKey } from '../../../common/constants/app.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly USER_CACHE_TTL = CACHE_TTL.USER_DATA;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private cacheService: RedisCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: any) {
    // Check cache first if we have tenantId in payload
    if (payload.tenantId) {
      const cacheKey = getCacheKey(CACHE_KEYS.USER, payload.tenantId, payload.sub);
      const cachedUser = await this.cacheService.get<any>(cacheKey);
      
      if (cachedUser) {
        return cachedUser;
      }
    }

    // If not in cache, fetch from database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { 
        role: true,
        tenant: {
          select: { isActive: true }
        }
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.tenant && !user.tenant.isActive) {
      throw new UnauthorizedException('Tenant subscription is inactive');
    }

    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    };

    // Cache user data
    if (user.tenantId) {
      const cacheKey = getCacheKey(CACHE_KEYS.USER, user.tenantId, user.id);
      await this.cacheService.set(cacheKey, userData, this.USER_CACHE_TTL);
    }

    return userData;
  }
}