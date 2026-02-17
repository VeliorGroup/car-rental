---
name: state-management
description: State management in Car Rental con Zustand e React Context. Usa quando lavori con auth store, stato globale, sidebar, filtri, o hook di performance.
---

# State Management — Car Rental Frontend

## Auth Store (Zustand)

File: `apps/web/src/lib/store/auth.ts`

```typescript
import { useAuthStore } from '@/lib/store/auth'

// Leggere stato
const { token, user, isAuthenticated } = useAuthStore()

// Azioni
const { login, logout } = useAuthStore()

// Login
login(accessToken, userData)

// Logout
logout()
```

Lo store è **persistito su localStorage** — sopravvive al refresh pagina.

## Context disponibili

### FilterBarContext

Registra filtri nella filter bar globale della pagina:

```typescript
import { usePageFilters } from '@/hooks/use-page-filters'

// Nel componente pagina
usePageFilters([
  { key: 'status', label: 'Stato', options: statusOptions },
  { key: 'category', label: 'Categoria', options: categoryOptions },
])
```

### DateFilterContext

Filtro date globale condiviso tra componenti della stessa pagina:

```typescript
import { useDateFilter } from '@/contexts/date-filter-context'
const { dateRange, setDateRange } = useDateFilter()
```

### SidebarContext

Stato aperto/chiuso della sidebar:

```typescript
import { useSidebar } from '@/contexts/sidebar-context'
const { isOpen, toggle } = useSidebar()
```

## Creare nuovo Zustand store

```typescript
// apps/web/src/lib/store/my-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface MyState {
  items: string[]
  addItem: (item: string) => void
  removeItem: (item: string) => void
  clear: () => void
}

export const useMyStore = create<MyState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (item) => set((state) => ({ items: state.items.filter(i => i !== item) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'my-store-key', // chiave localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

## Hook di performance

File: `apps/web/src/hooks/use-performance.ts`

```typescript
import { useDebounce, useThrottle, useWindowSize, useIsMounted } from '@/hooks/use-performance'

// Debounce per search input (evita troppe richieste)
const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300) // ritarda di 300ms

// Nel useQuery — usa debouncedSearch
queryKey: ['vehicles', debouncedSearch]

// Throttle per scroll events
const throttledHandler = useThrottle(handler, 100)

// Dimensioni finestra
const { width, height } = useWindowSize()
const isMobile = width < 768
```

## Toast notification

```typescript
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

// Successo
toast({ title: 'Salvato!', description: 'Le modifiche sono state applicate.' })

// Errore
toast({ title: 'Errore', description: message, variant: 'destructive' })
```
