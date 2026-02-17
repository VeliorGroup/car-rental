---
name: redis-cache
description: Redis caching e distributed locks in Car Rental. Usa quando implementi caching, invalidazione cache, distributed locks per prevenire race conditions, o quando lavori con RedisCacheService.
---

# Redis Cache — Car Rental

## RedisCacheService

Servizio in `apps/api/src/common/services/redis-cache.service.ts`.

```typescript
constructor(private readonly cache: RedisCacheService) {}
```

**Fallback automatico**: se Redis non è disponibile, usa cache in-memory. Nessun crash.

## Metodi disponibili

```typescript
// Get/Set base
await this.cache.get<T>(key: string): Promise<T | null>
await this.cache.set(key: string, value: any, ttlSeconds?: number): Promise<void>
await this.cache.delete(key: string): Promise<void>
await this.cache.deletePattern(pattern: string): Promise<void>

// Pattern compute-se-non-in-cache (più usato)
const data = await this.cache.getOrCompute<T>(
  key,
  async () => expensiveQuery(),
  ttlSeconds // default: 300 (5 min)
);
```

## Naming convention chiavi

```typescript
// Formato: entità:tenantId:identificatore
`analytics:dashboard:${tenantId}`
`vehicles:list:${tenantId}:page${page}`
`booking:${tenantId}:${bookingId}`
`pricing:${tenantId}:${vehicleId}`
```

## Pattern getOrCompute (analytics)

```typescript
async getDashboardKpis(tenantId: string) {
  return this.cache.getOrCompute(
    `analytics:dashboard:${tenantId}`,
    async () => {
      // query costose
      const [bookings, vehicles, revenue] = await Promise.all([...]);
      return { bookings, vehicles, revenue };
    },
    300 // TTL 5 minuti
  );
}
```

## Invalidazione cache

```typescript
// Singola chiave
await this.cache.delete(`vehicles:list:${tenantId}`);

// Pattern (tutte le chiavi che matchano)
await this.cache.deletePattern(`vehicles:*:${tenantId}:*`);
```

## Decorator @CacheInvalidate

```typescript
import { CacheInvalidate } from '../../common/decorators/cache-invalidate.decorator';

@Patch(':id')
@CacheInvalidate({ entity: 'vehicle', idParam: 'id' })
update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) { ... }
```

## Distributed locks (prevenzione race condition)

```typescript
const lockKey = `lock:booking:vehicle:${vehicleId}`;
const acquired = await this.cache.acquireLock(lockKey, 30000); // 30s TTL

if (!acquired) {
  throw new ConflictException('Vehicle is being processed by another request');
}

try {
  // operazione critica — una sola istanza alla volta
  await this.createBooking(...);
} finally {
  await this.cache.releaseLock(lockKey);
}
```

Usare i lock per: creazione prenotazioni, checkout/checkin, aggiornamento stato veicolo.
