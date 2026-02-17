---
name: api-patterns
description: Pattern API specifici di Car Rental per endpoints REST, autenticazione JWT, rate limiting e documentazione Swagger. Usa quando implementi nuovi endpoint API o modifichi quelli esistenti.
---

# API Patterns — Car Rental

## Struttura controller completa

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionRequiredGuard } from '../subscription/guards/subscription-required.guard';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('resource')
@ApiTags('Resource')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  @ApiOperation({ summary: 'List all resources' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  findAll(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.service.findAll(req.user!.tenantId, +page, +limit);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create resource' })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@Req() req: Request, @Body() dto: CreateResourceDto) {
    return this.service.create(req.user!.tenantId, dto, req.user!.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateResourceDto) {
    return this.service.update(req.user!.tenantId, id, dto, req.user!.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(req.user!.tenantId, id, req.user!.id);
  }
}
```

## Endpoint pubblici (bypass JWT)

```typescript
import { Public } from '../../common/decorators/public.decorator';

@Get('public-endpoint')
@Public()
publicMethod() { ... }
```

## Rate limiting

Configurato globalmente: **100 req/min** per IP.

Per endpoint specifici con limite diverso:
```typescript
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativi/min
login() { ... }
```

## Ruoli disponibili

Definiti nel database `UserRole`. Ruoli standard:
- `ADMIN` — accesso completo
- `MANAGER` — gestione operativa
- `OPERATOR` — operazioni base
- `VIEWER` — sola lettura

## Paginazione standard

```typescript
// Service
async findAll(tenantId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    this.prisma.resource.findMany({ where: { tenantId }, skip, take: limit }),
    this.prisma.resource.count({ where: { tenantId } }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```
