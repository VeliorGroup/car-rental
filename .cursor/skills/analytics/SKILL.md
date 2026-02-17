---
name: analytics
description: Sistema di analytics e dashboard in Car Rental. Usa quando implementi statistiche, KPI, grafici, report, o metriche Prometheus per il monitoring.
---

# Analytics — Car Rental

## Dashboard KPI

I dati del dashboard sono calcolati in `apps/api/src/modules/analytics/analytics.service.ts`.

**Caching obbligatorio** per tutte le query analytics:

```typescript
return this.cache.getOrCompute(
  `analytics:dashboard:${tenantId}`,
  async () => {
    // query costose qui
  },
  300 // TTL 5 minuti
);
```

## Metriche Prometheus

`MetricsService` espone metriche business in `apps/api/src/common/services/metrics.service.ts`:

```typescript
// Metriche disponibili
api_requests_total          // contatore richieste HTTP
api_request_duration_seconds // istogramma latenza
active_bookings_total       // gauge prenotazioni attive
available_vehicles_total    // gauge veicoli disponibili
pending_maintenances_total  // gauge manutenzioni in attesa
held_cautions_total         // gauge cauzioni trattenute
```

**Aggiornare le gauge** dopo operazioni che cambiano stato:

```typescript
await this.metrics.recordEvent('booking_created', { tenantId });
```

## Pattern query analytics

**Batch queries** per evitare N+1:

```typescript
// ✅ CORRETTO — una query con aggregazioni
const stats = await this.prisma.booking.groupBy({
  by: ['status'],
  where: { tenantId },
  _count: true,
});

// ❌ SBAGLIATO — query per ogni status
const confirmed = await this.prisma.booking.count({ where: { tenantId, status: 'CONFIRMED' } });
const checkedOut = await this.prisma.booking.count({ where: { tenantId, status: 'CHECKED_OUT' } });
```

**Aggregazione in-memory** con Map per ranking/profitability:

```typescript
const profitMap = new Map<string, number>();
bookings.forEach(b => {
  const prev = profitMap.get(b.vehicleId) ?? 0;
  profitMap.set(b.vehicleId, prev + Number(b.totalAmount));
});
```

## Export Excel

```typescript
import ExcelJS from 'exceljs';
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Report');
sheet.columns = [{ header: 'Vehicle', key: 'vehicle' }, ...];
// aggiungere righe...
const buffer = await workbook.xlsx.writeBuffer();
```

## Grafici frontend

Componenti chart in `apps/web/src/components/charts/` e `components/dashboard/`.
Usare `recharts` per tutti i grafici:

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
```
