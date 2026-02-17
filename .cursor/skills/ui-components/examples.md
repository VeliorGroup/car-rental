# UI Components — Esempi completi

## Esempio 1: Modal con Form completo

```tsx
// components/vehicles/vehicle-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VehicleForm } from './vehicle-form'

interface VehicleModalProps {
  open: boolean
  onClose: () => void
  vehicleId?: string | null
}

export function VehicleModal({ open, onClose, vehicleId }: VehicleModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vehicleId ? 'Modifica Veicolo' : 'Nuovo Veicolo'}
          </DialogTitle>
        </DialogHeader>
        <VehicleForm vehicleId={vehicleId} onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  )
}
```

```tsx
// components/vehicles/vehicle-form.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

const schema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  licensePlate: z.string().min(1),
  dailyPrice: z.number().min(0),
})

type FormValues = z.infer<typeof schema>

interface VehicleFormProps {
  vehicleId?: string | null
  onSuccess: () => void
}

export function VehicleForm({ vehicleId, onSuccess }: VehicleFormProps) {
  const t = useTranslations('Vehicles')
  const queryClient = useQueryClient()

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => api.get(`/vehicles/${vehicleId}`).then(r => r.data),
    enabled: !!vehicleId,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicle ?? { brand: '', model: '', licensePlate: '', dailyPrice: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      vehicleId
        ? api.patch(`/vehicles/${vehicleId}`, data)
        : api.post('/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onSuccess()
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.brand')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.model')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

## Esempio 2: DataTable con colonne avanzate

```tsx
// components/vehicles/vehicles-table.tsx
'use client'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Vehicle { id: string; brand: string; model: string; licensePlate: string; status: string }

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  AVAILABLE: 'default',
  RENTED: 'secondary',
  MAINTENANCE: 'destructive',
}

interface Props {
  data: Vehicle[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  isLoading?: boolean
}

export function VehiclesTable({ data, onEdit, onDelete, isLoading }: Props) {
  const t = useTranslations('Vehicles')

  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: 'licensePlate',
      header: t('columns.licensePlate'),
    },
    {
      accessorKey: 'brand',
      header: t('columns.brand'),
      cell: ({ row }) => `${row.original.brand} ${row.original.model}`,
    },
    {
      accessorKey: 'status',
      header: t('columns.status'),
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status] ?? 'secondary'}>
          {t(`status.${row.original.status.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original.id)}>
              <Edit className="mr-2 h-4 w-4" /> {t('actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(row.original.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t('actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return <DataTable columns={columns} data={data} isLoading={isLoading} />
}
```
