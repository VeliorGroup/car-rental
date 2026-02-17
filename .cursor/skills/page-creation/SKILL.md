---
name: page-creation
description: Creare nuove pagine e route in Car Rental (Next.js App Router). Usa quando crei una nuova schermata, sezione autenticata, pagina marketplace o route pubblica.
---

# Page Creation — Car Rental Frontend

## Tipi di route

| Tipo | Directory | Accesso |
|------|-----------|---------|
| Autenticata (pannello) | `apps/web/src/app/[locale]/(authenticated)/` | Richiede login |
| Marketplace | `apps/web/src/app/[locale]/(marketplace)/` | Pubblica |
| Pubblica | `apps/web/src/app/[locale]/` | Pubblica |
| Portale cliente | `apps/web/src/app/[locale]/customer/(authenticated)/` | Login cliente |
| Superadmin | `apps/web/src/app/[locale]/superadmin/` | Login superadmin |

## Template pagina autenticata

```tsx
// apps/web/src/app/[locale]/(authenticated)/my-module/page.tsx
import { useTranslations } from 'next-intl'
import { AppLayout } from '@/components/layout/app-layout'

export default function MyModulePage() {
  const t = useTranslations('MyModule')

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        {/* contenuto pagina */}
      </div>
    </AppLayout>
  )
}
```

## Aggiungere al Sidebar

File: `apps/web/src/components/layout/sidebar.tsx`

Aggiungere la voce nell'array di navigazione:

```typescript
{
  href: `/${locale}/my-module`,
  label: t('Navigation.myModule'),
  icon: SomeIcon,
}
```

## Aggiungere namespace i18n

1. `apps/web/src/i18n/request.ts` — aggiungere alla lista `NAMESPACES`:
```typescript
const NAMESPACES = [
  // ... esistenti ...
  'my-module', // ← aggiungere
]
```

2. Creare `apps/web/messages/en/my-module.json` come sorgente EN

3. Creare la stessa struttura per tutti i 10 locali restanti: `it es fr de pt el ro mk sr sq`

## Metadata SEO (server component)

```typescript
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MyModule')
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}
```

## Route con parametro dinamico

```
apps/web/src/app/[locale]/(authenticated)/my-module/[id]/page.tsx
```

```tsx
export default function MyModuleDetailPage({ params }: { params: { id: string } }) {
  // params.id disponibile
}
```
