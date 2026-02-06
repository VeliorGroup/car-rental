import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Standard pagination query parameters
 * Use with @Query() decorator in controllers
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field name',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Search query string',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Get Prisma skip value
   */
  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 20);
  }

  /**
   * Get Prisma take value
   */
  get take(): number {
    return this.limit || 20;
  }

  /**
   * Get Prisma orderBy object
   */
  getOrderBy(defaultField = 'createdAt'): Record<string, 'asc' | 'desc'> {
    return {
      [this.sortBy || defaultField]: this.sortOrder || 'desc',
    };
  }
}

/**
 * Extended pagination with date filters
 */
export class DateRangePaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Start date filter (ISO 8601)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter (ISO 8601)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  /**
   * Get Prisma date range filter
   */
  getDateFilter(fieldName = 'createdAt'): Record<string, unknown> | undefined {
    if (!this.startDate && !this.endDate) return undefined;

    const filter: Record<string, Date> = {};
    if (this.startDate) filter.gte = new Date(this.startDate);
    if (this.endDate) filter.lte = new Date(this.endDate);

    return { [fieldName]: filter };
  }
}
