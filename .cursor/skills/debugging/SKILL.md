---
name: debugging
description: Tecniche di debugging e troubleshooting per Car Rental. Usa quando hai errori, bug, problemi di performance, o devi investigare comportamenti inattesi nel backend o frontend.
---

# Debugging — Car Rental

## Identificazione rapida del tipo di errore

| Sintomo | Probabile causa |
|---------|----------------|
| `401 Unauthorized` | JWT scaduto, guard mancante, token superadmin su API tenant |
| `403 Forbidden` | Ruolo insufficiente, `@Roles()` mancante o errato |
| `404 Not Found` | ID errato, `tenantId` mancante nella query Prisma |
| `400 Bad Request` | DTO validation fallita, enum non valido, Decimal su aritmetica |
| `409 Conflict` | Race condition, risorsa già esistente |
| `500 Internal` | Errore Prisma, servizio esterno non raggiungibile |

## Debug backend NestJS

### 1. Controlla i guard
```typescript
// Verificare che tutti e tre siano presenti sul controller
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)
```

### 2. Controlla la query Prisma
```typescript
// Il tenantId è presente?
this.prisma.resource.findFirst({
  where: { id, tenantId }, // ← obbligatorio
})
// Usare findFirst (non findUnique) quando la chiave è composita (id + tenantId)
```

### 3. Enum mismatch
```typescript
// ❌ Causa comune di 400
enum Status { ACTIVE = 'ACTIVE' } // enum locale nel DTO
// ✅ Fix
import { Status } from '@prisma/client'; // enum Prisma
```

### 4. Decimal aritmetica
```typescript
// ❌ TypeError: cannot use operator on Decimal
const total = booking.dailyPrice * days;
// ✅ Fix
const total = Number(booking.dailyPrice) * days;
```

## Debug frontend Next.js

### 1. Namespace i18n mancante
```typescript
// Errore: "Missing message for key..."
// Fix: verificare che il namespace sia in NAMESPACES (apps/web/src/i18n/request.ts)
// e che il file JSON esista per il locale corrente
```

### 2. React Query cache stale
```typescript
// Dati non aggiornati dopo mutation
// Fix: aggiungere invalidateQueries nella onSuccess
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['resource'] });
}
```

### 3. Auth store vuoto
```typescript
// token null dopo refresh pagina?
// Verificare che lo store usi persist su localStorage
import { useAuthStore } from '@/lib/store/auth'
const { token } = useAuthStore() // non null se persistito
```

## Logs Docker

```bash
docker-compose logs -f api    # logs backend in tempo reale
docker-compose logs -f web    # logs frontend
docker-compose logs postgres  # errori database
```

## Prisma query debug

```bash
# Abilitare log queries in development
DATABASE_URL="postgresql://...?schema=public"
# In prisma client:
const prisma = new PrismaClient({ log: ['query', 'error'] })
```
