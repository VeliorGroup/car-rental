import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<string>();

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || uuidv4();

    // Set on request
    (req as any)[CORRELATION_ID_HEADER] = correlationId;

    // Set on response header
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Run in async context for access anywhere
    correlationStorage.run(correlationId, () => {
      next();
    });
  }
}

/**
 * Get current correlation ID from async context
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore();
}
