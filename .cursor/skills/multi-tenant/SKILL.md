---
name: multi-tenant
description: Best practices per sviluppo multi-tenant in Car Rental. Usa quando implementi funzionalità che devono rispettare l'isolamento dei tenant, gestione subscription, o quando lavori con dati tenant-specific.
---

# Multi-Tenancy — Car Rental

## Principio fondamentale

**Ogni operazione è scoped per `tenantId`.** Non esistono query che restituiscono dati di più tenant (eccetto superadmin).

## Isolamento dati

```typescript
// ✅ CORRETTO — tenant isolation
async findAll(tenantId: string) {
  return this.prisma.vehicle.findMany({
    where: { tenantId },
  });
}

// ❌ SBAGLIATO — nessun filtro tenant
async findAll() {
  return this.prisma.vehicle.findMany(); // restituisce dati di TUTTI i tenant
}
```

## TenantInterceptor

Estrae `tenantId` dal JWT e lo attacca a `request.tenant`:

```typescript
@UseInterceptors(TenantInterceptor)
// Poi nel controller:
const tenantId = req.user!.tenantId;
```

## Subscription check

`SubscriptionRequiredGuard` verifica che il tenant abbia:
- Subscription attiva (`ACTIVE` o `TRIALING`)
- Trial non scaduto

Per endpoint che non richiedono subscription (es. billing):
```typescript
import { SkipSubscriptionCheck } from '../subscription/decorators/skip-subscription.decorator';

@Get('billing')
@SkipSubscriptionCheck()
getBilling() { ... }
```

## Schema Prisma multi-tenant

Ogni modello deve avere `tenantId`:

```prisma
model Vehicle {
  id       String @id @default(cuid())
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  // ... altri campi
}
```

## Tenant dalla richiesta

```typescript
// Nel controller
const tenantId = req.user!.tenantId;
const userId = req.user!.id;
const userRole = req.user!.role.name;

// Passare sempre entrambi al service
return this.service.create(tenantId, dto, userId);
```

## Superadmin

Le route superadmin sono in `/superadmin/` e usano un JWT separato che viene bloccato da `JwtAuthGuard` sulle route tenant. Non mescolare mai accessi superadmin e tenant.

## Trial 14 giorni

Nuovi tenant ricevono automaticamente 14 giorni di trial:
```typescript
trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
```
