---
name: prisma-migrations
description: Schema Prisma e workflow migrazioni per Car Rental. Usa quando modifichi il database, aggiungi modelli, cambi relazioni, o gestisci migrazioni in sviluppo e produzione.
---

# Prisma Migrations — Car Rental

## Workflow sviluppo

```bash
# 1. Modifica apps/api/prisma/schema.prisma
# 2. Crea migrazione
cd apps/api
npx prisma migrate dev --name aggiungi_campo_X

# 3. Genera Prisma Client aggiornato (automatico con migrate dev)
npx prisma generate

# 4. Verifica stato
npx prisma migrate status
```

## Workflow produzione

```bash
# SOLO migrate deploy in produzione (mai migrate dev)
npx prisma migrate deploy

# Verifica migrazioni applicate
npx prisma migrate status
```

## Template nuovo modello multi-tenant

```prisma
model NewModel {
  id          String    @id @default(cuid())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Campi specifici
  name        String
  status      NewStatus @default(ACTIVE)
  
  // Multi-tenant OBBLIGATORIO
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Indice per performance
  @@index([tenantId])
  @@index([tenantId, status])
}

enum NewStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

## Relazioni comuni

```prisma
// One-to-many (tenant → vehicles)
tenantId String
tenant   Tenant @relation(fields: [tenantId], references: [id])

// Many-to-many esplicita
model BookingExtra {
  bookingId String
  extraId   String
  booking   Booking @relation(fields: [bookingId], references: [id])
  extra     Extra   @relation(fields: [extraId], references: [id])
  @@id([bookingId, extraId])
}
```

## Tipi Decimal

```prisma
// Schema
dailyPrice    Decimal  @db.Decimal(10, 2)
totalAmount   Decimal  @db.Decimal(10, 2)
```

```typescript
// TypeScript — SEMPRE convertire prima di aritmetica
const total = Number(vehicle.dailyPrice) * days; // ✅
const total = vehicle.dailyPrice * days;          // ❌ TypeError
```

## Aggiornare DTO dopo migrazione

Quando si aggiunge un nuovo enum in Prisma, aggiornare i DTO:

```typescript
// apps/api/src/modules/my-module/dto/my-module.dto.ts
import { NewStatus } from '@prisma/client'; // importare dal client generato

export class UpdateDto {
  @IsEnum(NewStatus) // ✅ usa Prisma enum
  status?: NewStatus;
}
```

## Reset database (solo sviluppo)

```bash
npx prisma migrate reset
# Attenzione: cancella tutti i dati!
```

## Studio (visualizzazione dati)

```bash
npx prisma studio
# Apre interfaccia web su http://localhost:5555
```
