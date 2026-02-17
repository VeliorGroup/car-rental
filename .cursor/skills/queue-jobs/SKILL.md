---
name: queue-jobs
description: Sistema di code e background jobs in Car Rental con pg-boss. Usa quando implementi job asincroni, background tasks, processamento email, notifiche differite, o schedule periodici.
---

# Queue & Jobs — Car Rental

## QueueService

Servizio in `apps/api/src/common/queue/queue.service.ts`.

**Importante**: Car Rental usa **pg-boss**, NON Bull/BullMQ. L'API è simile ma non identica.

```typescript
// Iniettare QueueService
constructor(private readonly queue: QueueService) {}
```

## Aggiungere un job

```typescript
// Aggiunge job alla coda
await this.queue.add(
  'queue-name',    // nome della coda
  'job-type',      // tipo/nome del job
  { ...data },     // payload del job
  { startAfter: new Date(Date.now() + 5000) } // opzionale: delay
);
```

## Registrare un worker

```typescript
// Nel module o nel service (onModuleInit)
async onModuleInit() {
  await this.queue.process('booking-notifications', async (job) => {
    switch (job.name) {
      case 'send-confirmation':
        await this.email.sendBookingConfirmation(job.data.to, job.data);
        break;
      case 'send-reminder':
        await this.email.sendReminderEmail(job.data.to, job.data);
        break;
    }
  });
}
```

## Code usate nel progetto

| Coda | Scopo |
|------|-------|
| `booking-notifications` | Email conferma/promemoria prenotazioni |
| `maintenance-reminders` | Promemoria manutenzione veicoli |
| `document-generation` | Generazione PDF asincrona |
| `caution-processing` | Processamento cauzioni |

## Configurazione database

pg-boss richiede connessione diretta (non pgbouncer/pooling):

```env
DIRECT_URL=postgresql://user:pass@host:5432/db?schema=public
# Non usare DATABASE_URL con pgbouncer per pg-boss
```

## Fallback graceful

Se pg-boss non è disponibile, i job vengono saltati senza errori. L'app funziona anche senza queue (email non inviate, ma nessun crash).

## Pattern waitForReady

```typescript
// Prima di operazioni critiche, aspettare che pg-boss sia pronto
await this.queue.waitForReady();
await this.queue.add('queue-name', 'job', data);
```

## Job con retry

```typescript
await this.queue.add('notifications', 'send-email', data, {
  retryLimit: 3,
  retryDelay: 30, // secondi tra retry
  expireInHours: 24,
});
```
