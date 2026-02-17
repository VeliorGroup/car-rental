---
name: forms
description: Form con React Hook Form, Zod e shadcn/ui in Car Rental. Usa quando crei form di creazione/modifica, validazione input, gestione errori, o form multi-step.
---

# Forms — Car Rental Frontend

## Setup base

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
  name: z.string().min(1, 'Campo obbligatorio'),
  email: z.string().email('Email non valida'),
  phone: z.string().optional(),
})
type FormValues = z.infer<typeof schema>
```

## Pattern FormField completo

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    
    {/* Input testo */}
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('fields.name')}</FormLabel>
          <FormControl>
            <Input placeholder={t('placeholders.name')} {...field} />
          </FormControl>
          <FormMessage /> {/* mostra errori di validazione */}
        </FormItem>
      )}
    />

    {/* Select */}
    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('fields.status')}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger><SelectValue /></SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
              <SelectItem value="INACTIVE">{t('status.inactive')}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />

    {/* Date picker */}
    <FormField
      control={form.control}
      name="startDate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('fields.startDate')}</FormLabel>
          <FormControl>
            <DatePicker value={field.value} onChange={field.onChange} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <Button type="submit" disabled={mutation.isPending}>
      {mutation.isPending ? t('common.saving') : t('common.save')}
    </Button>
  </form>
</Form>
```

## Schema Zod con messaggi tradotti

```tsx
// Per messaggi di errore tradotti, costruire lo schema dentro il componente
const t = useTranslations('Validation')

const schema = z.object({
  name: z.string().min(1, t('required')),
  email: z.string().email(t('invalidEmail')),
  phone: z.string().regex(/^\+?[\d\s-]+$/, t('invalidPhone')).optional().or(z.literal('')),
  price: z.number({ invalid_type_error: t('mustBeNumber') }).min(0, t('mustBePositive')),
})
```

## Form con dati esistenti (edit mode)

```tsx
// Popolare il form quando i dati arrivano dalla query
const { data: vehicle } = useQuery({ queryKey: ['vehicle', id], ... })

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: '', ... }, // valori vuoti iniziali
})

// Reset quando i dati sono pronti
useEffect(() => {
  if (vehicle) form.reset(vehicle)
}, [vehicle])
```

## Submit con useMutation

```tsx
const mutation = useMutation({
  mutationFn: (data: FormValues) =>
    id ? api.patch(`/resource/${id}`, data) : api.post('/resource', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] })
    onSuccess()
  },
  onError: (err: any) => {
    // Mostra errore del server nel form
    const message = err.response?.data?.message
    form.setError('root', { message })
  },
})

// Errore globale del server
{form.formState.errors.root && (
  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
)}
```
