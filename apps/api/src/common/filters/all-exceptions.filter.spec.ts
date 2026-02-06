import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { LoggerService } from '../services/logger.service';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let loggerService: LoggerService;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    loggerService = module.get<LoggerService>(LoggerService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      body: { password: 'secret' },
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const host = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalled();
  });

  it('should handle generic Error', () => {
    const exception = new Error('Internal error');
    const host = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    filter.catch(exception, host);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(loggerService.error).toHaveBeenCalled();
  });

  it('should sanitize sensitive data in logs', () => {
    const exception = new Error('Test error');
    mockRequest.body = { password: 'secret123', email: 'test@example.com' };

    const host = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    filter.catch(exception, host);

    const logCall = (loggerService.error as jest.Mock).mock.calls[0];
    const logData = JSON.parse(logCall[1]);
    
    expect(logData.request.body.password).toBe('***REDACTED***');
    expect(logData.request.body.email).toBe('test@example.com');
  });

  it('should not expose stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    
    const exception = new Error('Internal error');
    const host = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    filter.catch(exception, host);

    const responseCall = mockResponse.json.mock.calls[0][0];
    expect(responseCall.stack).toBeUndefined();
    
    process.env.NODE_ENV = 'test';
  });
});
