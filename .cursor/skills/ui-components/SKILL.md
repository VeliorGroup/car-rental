---
name: ui-components
description: Creare componenti UI in Car Rental (shadcn/ui, Radix UI, Tailwind). Usa quando crei card, modal, tabelle, grafici, form components, o qualsiasi componente React riutilizzabile.
---

# UI Components — Car Rental

## Principi base

- Componenti shadcn/ui in `apps/web/src/components/ui/`
- Componenti dominio in `apps/web/src/components/<domain>/`
- Classi Tailwind: sempre con `cn()` da `@/lib/utils`
- Icone: `lucide-react` (preferito), `@heroicons/react`, `react-icons`

## Pattern base componente

```tsx
import { cn } from '@/lib/utils'

interface MyCardProps {
  title: string
  className?: string
  children: React.ReactNode
}

export function MyCard({ title, className, children }: MyCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}
```

## Pattern Modal (Dialog Radix UI)

```tsx
// Stato nel componente padre (pagina)
const [open, setOpen] = useState(false)
const [selectedId, setSelectedId] = useState<string | null>(null)

// Nel JSX
<Button onClick={() => setOpen(true)}>Nuovo</Button>
<MyModal
  open={open}
  onClose={() => { setOpen(false); setSelectedId(null) }}
  id={selectedId}
/>

// Il modal
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function MyModal({ open, onClose, id }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{id ? 'Modifica' : 'Crea'}</DialogTitle>
        </DialogHeader>
        <MyForm id={id} onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  )
}
```

## Pattern DataTable

```tsx
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<MyItem>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'status', header: 'Stato', cell: ({ row }) => (
    <Badge>{row.original.status}</Badge>
  )},
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEdit(row.original.id)}>Modifica</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(row.original.id)}>Elimina</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

<DataTable columns={columns} data={data} />
```

## Pattern Charts (recharts)

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function MyChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

Per esempi completi, vedi [examples.md](examples.md).
