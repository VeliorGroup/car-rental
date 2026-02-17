---
name: payments
description: Sistema di pagamenti Paysera in Car Rental. Usa quando implementi pagamenti, gestione cauzioni, ordini, webhook Paysera, o quando lavori con createOrder, captureOrder, releaseOrder.
---

# Payments — Car Rental

## PayseraService

Servizio in `apps/api/src/common/services/paysera.service.ts`.

```typescript
constructor(private readonly paysera: PayseraService) {}
```

## Metodi disponibili

```typescript
// Crea ordine di pagamento
createOrder(params: {
  amount: number,      // importo in centesimi (es. 5000 = €50.00)
  currency: string,    // 'EUR'
  bookingId: string,
  description?: string,
  returnUrl?: string,
  cancelUrl?: string,
}): Promise<{ orderId: string, redirectUrl: string }>

// Cattura pagamento (trattieni i fondi)
captureOrder(orderId: string, amount?: number): Promise<void>

// Rilascia pagamento (sblocca i fondi)
releaseOrder(orderId: string): Promise<void>

// Stato ordine
getOrderStatus(orderId: string): Promise<OrderStatus>

// Verifica firma webhook
verifyWebhookSignature(payload: any, signature: string): boolean
```

## Configurazione

```env
PAYSERA_PROJECT_ID=123456
PAYSERA_SECRET=your_secret_key
PAYSERA_CALLBACK_URL=https://yourdomain.com/api/v1/payments/webhook
```

## Flusso pagamento cauzione

```typescript
// 1. Al momento della prenotazione — crea ordine
const order = await this.paysera.createOrder({
  amount: Math.round(cautionAmount * 100), // centesimi
  currency: 'EUR',
  bookingId: booking.id,
  description: `Cauzione prenotazione ${booking.id}`,
});

// Salva orderId sulla cauzione
await this.prisma.caution.update({
  where: { id: caution.id },
  data: { payseraOrderId: order.orderId, status: 'PENDING' },
});

// Restituisci redirectUrl al frontend per redirect al pagamento
return { redirectUrl: order.redirectUrl };

// 2. Al check-out — cattura cauzione
await this.paysera.captureOrder(caution.payseraOrderId);
await this.prisma.caution.update({ where: { id }, data: { status: 'HELD' } });

// 3. Al check-in senza danni — rilascia
await this.paysera.releaseOrder(caution.payseraOrderId);
await this.prisma.caution.update({ where: { id }, data: { status: 'RELEASED' } });

// 4. Al check-in con danni — addebita
await this.paysera.captureOrder(caution.payseraOrderId, damageAmount * 100);
await this.prisma.caution.update({ where: { id }, data: { status: 'CHARGED' } });
```

## Gestione webhook

```typescript
// POST /payments/webhook
@Post('webhook')
@Public()
async handleWebhook(@Body() payload: any, @Headers('x-paysera-signature') sig: string) {
  if (!this.paysera.verifyWebhookSignature(payload, sig)) {
    throw new BadRequestException('Invalid signature');
  }
  // processa evento: payment.completed, payment.failed, ecc.
}
```

## Stati cauzione

```typescript
enum CautionStatus {
  PENDING   // ordine creato, attesa pagamento
  HELD      // fondi trattenuti (check-out avvenuto)
  RELEASED  // fondi rilasciati (check-in senza danni)
  CHARGED   // fondi addebitati (danni)
}
```
