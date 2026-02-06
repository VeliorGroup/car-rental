import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisCacheService } from '../../../common/services/redis-cache.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: PrismaService;
  let cacheService: RedisCacheService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    tenantId: 'tenant-id',
    role: {
      id: 'role-id',
      name: 'ADMIN',
      permissions: [],
    },
    tenant: {
      isActive: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<RedisCacheService>(RedisCacheService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return cached user if available', async () => {
    const payload = { sub: 'user-id', tenantId: 'tenant-id' };
    const cachedUser = {
      id: 'user-id',
      email: 'test@example.com',
      tenantId: 'tenant-id',
      tenant: { isActive: true },
    };

    (cacheService.get as jest.Mock).mockResolvedValue(cachedUser);

    const result = await strategy.validate(payload);

    expect(result).toEqual(cachedUser);
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('should fetch user from database if not cached', async () => {
    const payload = { sub: 'user-id' };

    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await strategy.validate(payload);

    expect(result).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      tenantId: mockUser.tenantId,
    });
    expect(cacheService.set).toHaveBeenCalled();
  });

  it('should throw error if user not found', async () => {
    const payload = { sub: 'user-id' };

    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw error if tenant is inactive', async () => {
    const payload = { sub: 'user-id' };
    const inactiveUser = {
      ...mockUser,
      tenant: { isActive: false },
    };

    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
