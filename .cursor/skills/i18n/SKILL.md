---
name: i18n
description: Internazionalizzazione con next-intl in Car Rental. Usa quando aggiungi traduzioni, nuovi namespace, testi localizzati, o devi gestire i messaggi per gli 11 locali supportati.
---

# i18n — Car Rental (next-intl)

## Locali supportati

11 locali: `en` `it` `es` `fr` `de` `pt` `el` `ro` `mk` `sr` `sq`

## Regola critica

**Quando aggiungi un namespace, crei i file per TUTTI gli 11 locali.** Mai solo inglese.

## Aggiungere un nuovo namespace

### 1. Aggiorna NAMESPACES

File: `apps/web/src/i18n/request.ts`

```typescript
const NAMESPACES = [
  'common',
  // ... tutti gli esistenti ...
  'my-new-namespace', // ← aggiungere qui
]
```

### 2. Crea il file EN (sorgente)

`apps/web/messages/en/my-new-namespace.json`:

```json
{
  "MyNamespace": {
    "title": "My Feature",
    "description": "Description here",
    "actions": {
      "create": "Create",
      "edit": "Edit",
      "delete": "Delete"
    }
  }
}
```

### 3. Crea per tutti gli altri 10 locali

Stessa struttura chiavi, testo tradotto per:
`it/` `es/` `fr/` `de/` `pt/` `el/` `ro/` `mk/` `sr/` `sq/`

## Uso nel codice

```typescript
// Client component
'use client'
import { useTranslations } from 'next-intl'
export function MyComponent() {
  const t = useTranslations('MyNamespace')
  return <h1>{t('title')}</h1>
}

// Server component
import { getTranslations } from 'next-intl/server'
export async function MyServerComponent() {
  const t = await getTranslations('MyNamespace')
  return <h1>{t('title')}</h1>
}

// Metadata pagina (server)
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MyNamespace')
  return { title: t('meta.title') }
}
```

## Chiavi nidificate

```json
{ "actions": { "create": "Crea" } }
```
```typescript
t('actions.create') // → "Crea"
```

## Interpolazione

```json
{ "welcome": "Ciao {name}!" }
```
```typescript
t('welcome', { name: 'Marco' }) // → "Ciao Marco!"
```

## Namespace esistenti (28 file)

`common` `dashboard` `customers` `vehicles` `bookings` `calendar` `branches` `cautions` `damages` `maintenance` `analytics` `notifications` `settings` `auth` `home` `tires` `public-booking` `customer-portal` `customer-auth` `superadmin` `billing` `documents` `fuel-logs` `reports` `api-keys` `audit-logs` `email-templates` `checkout`
