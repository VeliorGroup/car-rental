import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantMiddleware } from './tenant.middleware';
import { Request, Response, NextFunction } from 'express';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMiddleware,
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'NODE_ENV') return 'production';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    mockRequest = {
      headers: {},
      path: '/api/some/path',
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should extract tenantId from JWT token', () => {
    const mockPayload = { tenantId: 'c123456789012345678901234', sub: 'user-id' };
    (jwtService.decode as jest.Mock).mockReturnValue(mockPayload);
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest['tenantId']).toBe('c123456789012345678901234');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should throw error in production if no tenantId found', () => {
    (configService.get as jest.Mock).mockReturnValue('production');
    (jwtService.decode as jest.Mock).mockReturnValue(null);
    mockRequest.headers = {};

    expect(() => {
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    }).toThrow(UnauthorizedException);
  });

  it('should allow header fallback in development', () => {
    (configService.get as jest.Mock).mockReturnValue('development');
    (jwtService.decode as jest.Mock).mockReturnValue(null);
    mockRequest.headers = {
      'x-tenant-id': 'c123456789012345678901234',
    };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest['tenantId']).toBe('c123456789012345678901234');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should validate tenantId format', () => {
    (jwtService.decode as jest.Mock).mockReturnValue({ tenantId: 'invalid-format' });
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    expect(() => {
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    }).toThrow(UnauthorizedException);
  });
});
