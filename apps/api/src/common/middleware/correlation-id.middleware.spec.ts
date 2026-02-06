import { Test, TestingModule } from '@nestjs/testing';
import {
  CorrelationIdMiddleware,
  CORRELATION_ID_HEADER,
  correlationStorage,
  getCorrelationId,
} from './correlation-id.middleware';
import { Request, Response, NextFunction } from 'express';

// The project globally mocks uuid → v4 returns 'mock-uuid-v4'
const MOCK_UUID = 'mock-uuid-v4';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Record<string, any>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorrelationIdMiddleware],
    }).compile();

    middleware = module.get<CorrelationIdMiddleware>(CorrelationIdMiddleware);

    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should generate a UUID when no correlation header is present', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    const correlationId = mockRequest[CORRELATION_ID_HEADER];
    expect(correlationId).toBeDefined();
    expect(correlationId).toBe(MOCK_UUID);
  });

  it('should use existing header value when x-correlation-id is provided', () => {
    const existingId = 'existing-correlation-id-12345';
    mockRequest.headers = { [CORRELATION_ID_HEADER]: existingId };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest[CORRELATION_ID_HEADER]).toBe(existingId);
  });

  it('should set the correlation id on the response header', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    const correlationId = mockRequest[CORRELATION_ID_HEADER];
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      correlationId,
    );
  });

  it('should call next() within the async local storage context', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('should store correlation id in async local storage', (done) => {
    // Override next() to check async context inside the storage.run callback
    const checkNext: NextFunction = () => {
      const storeValue = correlationStorage.getStore();
      expect(storeValue).toBeDefined();
      expect(storeValue).toBe(mockRequest[CORRELATION_ID_HEADER]);
      done();
    };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      checkNext,
    );
  });

  it('should make correlation id accessible via getCorrelationId() helper', (done) => {
    const checkNext: NextFunction = () => {
      const id = getCorrelationId();
      expect(id).toBeDefined();
      expect(id).toBe(mockRequest[CORRELATION_ID_HEADER]);
      done();
    };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      checkNext,
    );
  });

  it('should set consistent id on request, response header, and async storage', (done) => {
    const customId = 'my-custom-trace-id';
    mockRequest.headers = { [CORRELATION_ID_HEADER]: customId };

    const checkNext: NextFunction = () => {
      // All three locations should have the same value
      expect(mockRequest[CORRELATION_ID_HEADER]).toBe(customId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        customId,
      );
      expect(getCorrelationId()).toBe(customId);
      done();
    };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      checkNext,
    );
  });
});
