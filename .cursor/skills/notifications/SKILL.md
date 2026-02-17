---
name: notifications
description: Sistema di notifiche e comunicazioni in Car Rental. Usa quando implementi notifiche, email, SMS, o scheduler di promemoria per scadenze e prenotazioni.
---

# Notifications — Car Rental

## EmailService

Servizio in `apps/api/src/common/services/email.service.ts` (provider: Resend).

```typescript
// Metodi disponibili
sendBookingConfirmation(to: string, data: BookingEmailData, tenantId?: string): Promise<void>
sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string): Promise<void>
sendWelcomeEmail(to: string, firstName: string, loginUrl: string): Promise<void>
sendTemplateEmail(to: string, subject: string, html: string): Promise<void>
```

## Invio email via queue (pattern corretto)

**Non** chiamare EmailService direttamente dal service. Usare la queue:

```typescript
// Nel service, dopo creazione prenotazione
await this.queue.add('booking-notifications', 'send-confirmation', {
  bookingId: booking.id,
  tenantId,
  to: customer.email,
});

// Nel worker (registrato nel module o all'avvio)
await this.queue.process('booking-notifications', async (job) => {
  if (job.name === 'send-confirmation') {
    await this.email.sendBookingConfirmation(job.data.to, job.data);
  }
});
```

## Configurazione email

```env
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Car Rental
```

In sviluppo (senza API key): le email vengono logggate in console invece di essere inviate.

## NotificationsModule

Modulo in `apps/api/src/modules/notifications/` per notifiche in-app.

```typescript
// POST /notifications — crea notifica
// GET /notifications — lista notifiche utente
// PATCH /notifications/:id/read — segna come letta
// PATCH /notifications/read-all — segna tutte come lette
```

## Scheduler (scadenze e promemoria)

Usa `@nestjs/schedule` per job periodici:

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationScheduler {
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendLicenseExpiryReminders() {
    // trova clienti con licenza in scadenza entro 30 giorni
    // invia email di promemoria
  }
}
```

## SMS (SmsService)

Attualmente in modalità log (placeholder). Configurazione:
```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+1234567890
```
