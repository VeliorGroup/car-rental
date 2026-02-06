import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API Response wrapper
 * All API responses should use this format for consistency
 */
export class ApiResponse<T> {
  @ApiProperty({ description: 'Whether the request was successful' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error message if request failed' })
  message?: string;

  @ApiPropertyOptional({ description: 'Error code for client handling' })
  code?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, {
      timestamp: new Date().toISOString(),
      ...partial,
    });
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse({
      success: true,
      data,
      message,
    });
  }

  static error(message: string, code?: string): ApiResponse<null> {
    return new ApiResponse({
      success: false,
      message,
      code,
    });
  }
}

/**
 * Paginated response wrapper
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Array of items' })
  items: T[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page (1-indexed)' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

/**
 * Paginated API Response (combines both wrappers)
 */
export class PaginatedApiResponse<T> extends ApiResponse<PaginatedResponse<T>> {
  constructor(items: T[], total: number, page: number, limit: number) {
    super({
      success: true,
      data: new PaginatedResponse(items, total, page, limit),
    });
  }
}
