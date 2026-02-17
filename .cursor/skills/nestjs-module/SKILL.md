---
name: nestjs-module
description: Template per creare nuovi moduli NestJS in Car Rental seguendo i pattern esistenti. Usa quando devi creare un nuovo modulo API, controller, service, o DTO per il backend.
---

# NestJS Module Template — Car Rental

## Struttura directory

```
apps/api/src/modules/my-module/
├── my-module.module.ts
├── my-module.controller.ts
├── my-module.service.ts
└── dto/
    └── my-module.dto.ts
```

## 1. Module

```typescript
// my-module.module.ts
import { Module } from '@nestjs/common';
import { MyModuleController } from './my-module.controller';
import { MyModuleService } from './my-module.service';

@Module({
  controllers: [MyModuleController],
  providers: [MyModuleService],
  exports: [MyModuleService],
})
export class MyModule {}
```

## 2. Controller

```typescript
// my-module.controller.ts
@Controller('my-module')
@ApiTags('MyModule')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
@UseInterceptors(TenantInterceptor)
export class MyModuleController {
  constructor(private readonly service: MyModuleService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  findAll(@Req() req: Request, @Query('page') page = 1) {
    return this.service.findAll(req.user!.tenantId, +page);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(req.user!.tenantId, id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Req() req: Request, @Body() dto: CreateMyModuleDto) {
    return this.service.create(req.user!.tenantId, dto, req.user!.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateMyModuleDto) {
    return this.service.update(req.user!.tenantId, id, dto, req.user!.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(req.user!.tenantId, id, req.user!.id);
  }
}
```

## 3. Service

```typescript
// my-module.service.ts
@Injectable()
export class MyModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService,
    private readonly cache: RedisCacheService,
  ) {}

  async findAll(tenantId: string, page: number, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.myModel.findMany({ where: { tenantId }, skip, take: limit }),
      this.prisma.myModel.count({ where: { tenantId } }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.myModel.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException(`MyModel ${id} not found`);
    return item;
  }

  async create(tenantId: string, dto: CreateMyModuleDto, userId: string) {
    const item = await this.prisma.myModel.create({ data: { ...dto, tenantId } });
    await this.audit.log(tenantId, 'CREATE', 'MyModel', item.id, userId);
    return item;
  }
}
```

## 4. DTO

```typescript
// dto/my-module.dto.ts
import { MyStatus } from '@prisma/client'; // enum Prisma, non locale

export class CreateMyModuleDto {
  @IsString() @ApiProperty()
  name: string;

  @IsEnum(MyStatus) @IsOptional() @ApiPropertyOptional()
  status?: MyStatus;
}

export class UpdateMyModuleDto extends PartialType(CreateMyModuleDto) {}
```

## 5. Registrazione in app.module.ts

```typescript
// Aggiungere in apps/api/src/app.module.ts
import { MyModule } from './modules/my-module/my-module.module';

@Module({
  imports: [
    // ... moduli esistenti ...
    MyModule,
  ],
})
```
