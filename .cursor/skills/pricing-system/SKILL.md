---
name: pricing-system
description: Sistema di pricing dinamico di Car Rental per calcolo prezzi noleggio veicoli. Usa quando lavori con prezzi, sconti, extra, stagionalità, o quando devi implementare logiche di calcolo totale prenotazioni.
---

# Pricing System — Car Rental

## Struttura prezzo prenotazione

```typescript
// Campi sulla Booking
basePrice      // prezzo base giornaliero veicolo
dailyPrice     // prezzo effettivo (dopo sconti stagionali)
totalAmount    // totale finale (dailyPrice × giorni + extras - discount)
discountAmount // sconto applicato
cautionAmount  // deposito cauzionale
```

## Calcolo prezzo

Il calcolo avviene nel `BookingsService` prima della creazione:

```typescript
const days = calculateDays(startDate, endDate);  // da apps/web/src/lib/utils.ts o apps/api
const baseTotal = Number(vehicle.dailyPrice) * days;
const extrasTotal = extras.reduce((sum, e) => sum + e.price * days, 0);
const discountAmount = applyDiscount(baseTotal, discountCode);
const totalAmount = baseTotal + extrasTotal - discountAmount;
const cautionAmount = vehicle.cautionAmount ?? 0;
```

## Extra noleggio

```typescript
// Extra comuni
{ name: 'GPS', price: 5, perDay: true }
{ name: 'Seggiolino bambini', price: 8, perDay: true }
{ name: 'Conducente aggiuntivo', price: 10, perDay: true }
{ name: 'Assicurazione Kasko', price: 15, perDay: true }
```

## CalculatePriceDto

```typescript
export class CalculatePriceDto {
  @IsString()
  vehicleId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray() @IsOptional()
  extras?: ExtraItemDto[];

  @IsString() @IsOptional()
  discountCode?: string;
}
```

## Endpoint calcolo preventivo

```typescript
// POST /bookings/calculate-price — calcola senza creare prenotazione
// Usato dal checkout pubblico per mostrare il totale prima della conferma
```

## Cauzione (franchise deposit)

La cauzione è trattenuta al check-out e rilasciata/addebitata al check-in in base ai danni:

```typescript
// Check-in senza danni → rilascia cauzione
await this.paysera.releaseOrder(caution.payseraOrderId);

// Check-in con danni → addebita cauzione (parzialmente o totalmente)
await this.paysera.captureOrder(caution.payseraOrderId, damageAmount);
```
