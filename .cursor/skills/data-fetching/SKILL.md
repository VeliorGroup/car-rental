---
name: data-fetching
description: Data fetching con TanStack Query in Car Rental. Usa quando implementi chiamate API, useQuery, useMutation, gestione cache, o loading/error states nel frontend.
---

# Data Fetching — Car Rental Frontend

## Client API

```typescript
// Autenticato (pannello admin) — include token JWT automaticamente
import { api } from '@/lib/api'

// Pubblico (marketplace, portale cliente) — senza token
import { publicApi } from '@/lib/api/public-api'
```

## useQuery — lettura dati

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const { data, isLoading, isError, error } = useQuery({
  queryKey: ['vehicles', page, search, statusFilter],  // chiave composita
  queryFn: async () => {
    const res = await api.get('/vehicles', {
      params: { page, limit: 10, search, status: statusFilter !== 'all' ? statusFilter : undefined }
    })
    return res.data
  },
  staleTime: 60_000,     // dati freschi per 1 minuto (default globale)
  enabled: !!tenantId,   // condizionale: esegui solo se tenantId esiste
})
```

## useMutation — scrittura dati

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const createMutation = useMutation({
  mutationFn: (data: CreateVehicleDto) => api.post('/vehicles', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] }) // invalida cache
    toast({ title: 'Veicolo creato con successo' })
    onClose()
  },
  onError: (error: any) => {
    toast({ title: 'Errore', description: error.response?.data?.message, variant: 'destructive' })
  },
})

// Nel form submit
form.handleSubmit((values) => createMutation.mutate(values))()

// Stato nel button
<Button disabled={createMutation.isPending}>
  {createMutation.isPending ? 'Salvataggio...' : 'Salva'}
</Button>
```

## Client API modulari disponibili

```typescript
// In apps/web/src/lib/api/
import { usersApi } from '@/lib/api/users'
import { reportsApi } from '@/lib/api/reports'
import { documentsApi } from '@/lib/api/documents'
import { emailTemplatesApi } from '@/lib/api/email-templates'
import { apiKeysApi } from '@/lib/api/api-keys'
import { fuelLogsApi } from '@/lib/api/fuel-logs'
import { auditLogsApi } from '@/lib/api/audit-logs'
```

## Pattern loading + error state

```tsx
const { data, isLoading, isError } = useQuery({ ... })

if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>
if (isError) return <div className="text-destructive">{t('errors.loadError')}</div>
```

## Configurazione globale QueryClient

In `apps/web/src/app/providers.tsx`:
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 minuto
      refetchOnWindowFocus: false, // no refetch al cambio tab
    }
  }
})
```

## Prefetch (server component)

```typescript
// Per dati critici: prefetch nel server component
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

const queryClient = new QueryClient()
await queryClient.prefetchQuery({
  queryKey: ['vehicles'],
  queryFn: () => fetchVehicles(),
})
```
