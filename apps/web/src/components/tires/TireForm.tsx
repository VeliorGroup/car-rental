'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface TireFormProps {
  initialData?: Record<string, unknown>
  onSuccess?: () => void
  onCancel?: () => void
}

export function TireForm({ initialData, onSuccess, onCancel }: TireFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const t = useTranslations('Tires')
  const tc = useTranslations('Common')
  
  const [formData, setFormData] = useState({
    vehicleId: '',
    brand: '',
    model: '',
    size: '',
    position: 'FL',
    season: 'ALL_SEASON',
    mountDate: new Date().toISOString().split('T')[0],
    mountKm: 0,
    cost: '0',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        vehicleId: initialData.vehicleId || '',
        brand: initialData.brand || '',
        model: initialData.model || '',
        size: initialData.size || '',
        position: initialData.position || 'FL',
        season: initialData.season || 'ALL_SEASON',
        mountDate: initialData.mountDate ? initialData.mountDate.split('T')[0] : new Date().toISOString().split('T')[0],
        mountKm: initialData.mountKm || 0,
        cost: String(initialData.cost || '0'),
      })
    }
  }, [initialData])

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-simple'],
    queryFn: async () => {
      const response = await api.get('/vehicles', { params: { limit: 100 } })
      return response.data.vehicles || response.data
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (initialData?.id) {
        await api.patch(`/tires/${initialData.id}`, data)
      } else {
        await api.post('/tires', data)
      }
    },
    onSuccess: () => {
      toast({ title: initialData?.id ? tc('saveSuccess') || 'Saved' : t('createSuccess') })
      queryClient.invalidateQueries({ queryKey: ['tires'] })
      queryClient.invalidateQueries({ queryKey: ['tires-stats'] })
      onSuccess?.()
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast({ title: tc('error') || 'Error', description: err.response?.data?.message, variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.brand || !formData.size) {
      toast({ title: t('requiredFields') || 'Brand and Size are required', variant: 'destructive' })
      return
    }
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>{t('selectVehicle')}</Label>
        <Select value={formData.vehicleId} onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectVehicle')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No vehicle (Storage)</SelectItem>
            {vehicles?.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.licensePlate})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('brand')}</Label>
          <Input
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="Michelin"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('model')}</Label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="Pilot Sport 4"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('size')}</Label>
        <Input
          value={formData.size}
          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
          placeholder="205/55R16"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('position')}</Label>
          <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FL">{t('positions.fl')}</SelectItem>
              <SelectItem value="FR">{t('positions.fr')}</SelectItem>
              <SelectItem value="RL">{t('positions.rl')}</SelectItem>
              <SelectItem value="RR">{t('positions.rr')}</SelectItem>
              <SelectItem value="SPARE">{t('positions.spare')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('season')}</Label>
          <Select value={formData.season} onValueChange={(v) => setFormData({ ...formData, season: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUMMER">{t('seasons.summer')}</SelectItem>
              <SelectItem value="WINTER">{t('seasons.winter')}</SelectItem>
              <SelectItem value="ALL_SEASON">{t('seasons.allSeason')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('mountDate')}</Label>
          <Input
            type="date"
            value={formData.mountDate}
            onChange={(e) => setFormData({ ...formData, mountDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('mountKm')}</Label>
          <Input
            type="number"
            value={formData.mountKm}
            onChange={(e) => setFormData({ ...formData, mountKm: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('cost')} (€)</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.cost}
          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
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
