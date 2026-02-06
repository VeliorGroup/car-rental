'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'

interface Vehicle {
  id: string
  brand: string
  model: string
  licensePlate: string
}

interface MaintenanceFormProps {
  initialData?: Record<string, unknown>
  onSuccess?: () => void
  onCancel?: () => void
}

export function MaintenanceForm({ initialData, onSuccess, onCancel }: MaintenanceFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const t = useTranslations('Maintenance')
  const tc = useTranslations('Common')
  
  const [formData, setFormData] = useState({
    vehicleId: '',
    title: '',
    type: 'ROUTINE',
    description: '',
    priority: 'MEDIUM',
    status: 'SCHEDULED',
    scheduledFor: '',
    cost: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        vehicleId: initialData.vehicleId || initialData.vehicle?.id || '',
        title: initialData.title || '',
        type: initialData.type || 'ROUTINE',
        description: initialData.description || '',
        priority: initialData.priority || 'MEDIUM',
        status: initialData.status || 'SCHEDULED',
        scheduledFor: initialData.scheduledFor 
          ? new Date(initialData.scheduledFor).toISOString().slice(0, 16)
          : '',
        cost: initialData.cost ? String(initialData.cost) : '',
      })
    }
  }, [initialData])

  const { data: vehiclesData } = useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const response = await api.get('/vehicles', { params: { limit: 100 } })
      return response.data
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : null,
        cost: data.cost ? parseFloat(data.cost) : null,
      }
      if (initialData?.id) {
        await api.patch(`/maintenance/${initialData.id}`, payload)
      } else {
        await api.post('/maintenance', payload)
      }
    },
    onSuccess: () => {
      toast({ title: initialData?.id ? tc('saveSuccess') || 'Saved' : t('createSuccess') })
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      onSuccess?.()
    },
    onError: () => {
      toast({ title: tc('error') || 'Error', variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.vehicleId || !formData.title) {
      toast({ title: t('requiredFields'), variant: 'destructive' })
      return
    }
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="vehicleId">{tc('vehicle')} <span className="text-red-500">*</span></Label>
        <Select
          value={formData.vehicleId}
          onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
          disabled={!!initialData}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('selectVehicle')} />
          </SelectTrigger>
          <SelectContent>
            {vehiclesData?.vehicles?.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">{t('titleColumn')} <span className="text-red-500">*</span></Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t('titlePlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="type">{t('type')}</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ROUTINE">{t('types.routine')}</SelectItem>
              <SelectItem value="REPAIR">{t('types.repair')}</SelectItem>
              <SelectItem value="INSPECTION">{t('types.inspection')}</SelectItem>
              <SelectItem value="TIRE_CHANGE">{t('types.tireChange')}</SelectItem>
              <SelectItem value="OIL_CHANGE">{t('types.oilChange')}</SelectItem>
              <SelectItem value="BRAKE_SERVICE">{t('types.brakeService')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="priority">{t('priorityLabel')}</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">{t('priority.low')}</SelectItem>
              <SelectItem value="MEDIUM">{t('priority.medium')}</SelectItem>
              <SelectItem value="HIGH">{t('priority.high')}</SelectItem>
              <SelectItem value="URGENT">{t('priority.urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="status">{tc('status')}</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
              <SelectItem value="SCHEDULED">{t('status.scheduled')}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t('status.inProgress')}</SelectItem>
              <SelectItem value="COMPLETED">{t('status.completed')}</SelectItem>
              <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cost">{t('cost')}</Label>
          <Input
            id="cost"
            type="number"
            min="0"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="100.00"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="scheduledFor">{t('scheduledFor')}</Label>
        <Input
          id="scheduledFor"
          type="datetime-local"
          value={formData.scheduledFor}
          onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">{tc('description')}</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="flex gap-4 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tc('cancel')}
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader className="mr-2" />}
          {mutation.isPending ? tc('loading') : tc('save')}
        </Button>
      </div>
    </form>
  )
}
