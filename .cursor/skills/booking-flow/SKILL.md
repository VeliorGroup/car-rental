---
name: booking-flow
description: Gestisce il flusso completo delle prenotazioni in Car Rental (creazione, check-out, check-in, cauzioni, danni). Usa quando lavori con bookings, cautions, damages o quando devi implementare operazioni di noleggio veicoli.
---

# Booking Flow — Car Rental

## Stati prenotazione

```
CONFIRMED → CHECKED_OUT → CHECKED_IN → (completata)
         ↘ CANCELLED
         ↘ NO_SHOW
```

La transizione è validata con `validateStateTransition()` nel service. Ogni transizione non valida lancia `BadRequestException`.

## Flusso completo

### 1. Creazione prenotazione

```typescript
// POST /bookings
// Valida: vehicle AVAILABLE, customer ACTIVE, date range libero
// Calcola: totalAmount, cautionAmount (pricing dinamico)
// Crea: Booking + opzionale Caution
// Invia: email conferma via queue
```

### 2. Check-out (consegna veicolo)

```typescript
// POST /bookings/:id/checkout
// Valida: status CONFIRMED
// Richiede: kmOut, fuelLevelOut, checkOutData (foto, firme)
// Aggiorna: vehicle.status → RENTED
// Genera: PDF check-out, carica su MinIO
// Transizione: CONFIRMED → CHECKED_OUT
```

### 3. Check-in (restituzione veicolo)

```typescript
// POST /bookings/:id/checkin
// Valida: status CHECKED_OUT
// Richiede: kmIn, fuelLevelIn, checkInData
// Calcola: costo carburante mancante, km extra
// Aggiorna: vehicle.status → AVAILABLE
// Genera: PDF check-in
// Transizione: CHECKED_OUT → CHECKED_IN
```

## Cauzioni

```typescript
// Status cauzione: PENDING → HELD → RELEASED | CHARGED
// PayseraService per gestione pagamento digitale
await this.paysera.createOrder({ amount, currency: 'EUR', bookingId });
await this.paysera.captureOrder(orderId);   // trattieni
await this.paysera.releaseOrder(orderId);   // rilascia
```

## Danni

```typescript
// Associati a booking + vehicle
// damage.severity: MINOR | MODERATE | SEVERE | TOTAL_LOSS
// damage.position: FRONT | REAR | LEFT | RIGHT | TOP | INTERIOR
// Dopo check-in con danni: notifica al manager
```

## Calcolo prezzo

Il pricing è gestito dal `PricingService`:
- `dailyPrice` × giorni
- `+ extras` (GPS, seggiolino, ecc.)
- `- discount` (codice promo, cliente fedele)
- `= totalAmount`

## Lock distribuito (prevenzione race condition)

```typescript
const lock = await this.cache.acquireLock(`booking:vehicle:${vehicleId}`, 30000);
if (!lock) throw new ConflictException('Vehicle is being processed');
try {
  // operazione atomica
} finally {
  await this.cache.releaseLock(`booking:vehicle:${vehicleId}`);
}
```
