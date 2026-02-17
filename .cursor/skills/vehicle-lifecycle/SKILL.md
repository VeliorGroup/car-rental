---
name: vehicle-lifecycle
description: Gestione completa del ciclo di vita dei veicoli in Car Rental (stati, manutenzione, pneumatici, scadenze assicurazione/revisione). Usa quando lavori con vehicles, maintenance, tires, o quando devi implementare logiche di fleet management.
---

# Vehicle Lifecycle — Car Rental

## Stati veicolo

```
AVAILABLE ←→ RESERVED → RENTED → AVAILABLE
           ↘ OUT_OF_SERVICE
           ↘ MAINTENANCE
```

```typescript
enum VehicleStatus {
  AVAILABLE     // disponibile per prenotazione
  RESERVED      // prenotato ma non ancora consegnato
  RENTED        // in uso dal cliente
  OUT_OF_SERVICE // fuori servizio (manuale)
  MAINTENANCE   // in manutenzione
}
```

## Transizioni automatiche

| Evento | Stato precedente | Nuovo stato |
|--------|-----------------|-------------|
| Check-out | `AVAILABLE` / `RESERVED` | `RENTED` |
| Check-in | `RENTED` | `AVAILABLE` |
| Avvia manutenzione | qualsiasi | `MAINTENANCE` |
| Completa manutenzione | `MAINTENANCE` | `AVAILABLE` |

## Manutenzione

```typescript
// MaintenanceModule — apps/api/src/modules/maintenance/
// Status: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
// Type: OIL_CHANGE | TIRE_ROTATION | BRAKE_SERVICE | GENERAL | ...
// Priority: LOW | MEDIUM | HIGH | URGENT

// Cambio stato veicolo al completamento manutenzione
await this.prisma.$transaction([
  this.prisma.maintenance.update({ where: { id }, data: { status: 'COMPLETED' } }),
  this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'AVAILABLE' } }),
]);
```

## Pneumatici

```typescript
// TiresModule — apps/api/src/modules/tires/
// Campi: vehicleId, type (SUMMER/WINTER/ALL_SEASON), brand, size, treadDepth
// Gestione cambio stagionale e usuura
```

## Scadenze da monitorare

```typescript
// Campi sulla Vehicle (o tabella separata):
insuranceExpiryDate  // scadenza assicurazione
roadTaxExpiryDate    // bollo
inspectionDate       // revisione periodica
```

Scheduler per promemoria (30 giorni prima scadenza):
```typescript
@Cron(CronExpression.EVERY_DAY_AT_8AM)
async checkVehicleExpiries() {
  const expiringVehicles = await this.prisma.vehicle.findMany({
    where: {
      tenantId,
      insuranceExpiryDate: { lte: addDays(new Date(), 30) }
    }
  });
  // invia notifiche via queue
}
```

## Fuel logs

```typescript
// FuelLogsModule — apps/api/src/modules/fuel-logs/
// Traccia rifornimenti: vehicleId, liters, pricePerLiter, totalCost, odometer
// Calcola consumo medio: km percorsi / litri consumati
```

## Kmh e chilometraggio

```typescript
// Aggiornamento km al check-in
await this.prisma.vehicle.update({
  where: { id: vehicleId },
  data: { currentKm: checkInData.kmIn }
});
```
