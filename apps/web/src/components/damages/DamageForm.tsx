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

interface Booking {
  id: string
  customer: {
    firstName: string
    lastName: string
  }
  vehicle: {
    id: string
    brand: string
    model: string
    licensePlate: string
  }
}

const SEVERITIES = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'TOTAL_LOSS', label: 'Total Loss' },
]

const DAMAGE_TYPES = ['Scratch', 'Dent', 'Broken Glass', 'Missing Part', 'Mechanical', 'Other']
const POSITIONS = ['Front', 'Rear', 'Left Side', 'Right Side', 'Roof', 'Interior', 'Undercarriage']

interface DamageFormProps {
  initialData?: Record<string, unknown>
  onSuccess?: () => void
  onCancel?: () => void
}

export function DamageForm({ initialData, onSuccess, onCancel }: DamageFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const t = useTranslations('Damages')
  const tc = useTranslations('Common')
  
  const [bookingSearch, setBookingSearch] = useState('')
  const [formData, setFormData] = useState({
    bookingId: '',
    vehicleId: '',
    severity: 'MINOR',
    type: 'Scratch',
    position: 'Front',
    description: '',
    estimatedCost: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        bookingId: initialData.bookingId || initialData.booking?.id || '',
        vehicleId: initialData.vehicleId || initialData.vehicle?.id || '',
        severity: initialData.severity || 'MINOR',
        type: initialData.type || 'Scratch',
        position: initialData.position || 'Front',
        description: initialData.description || '',
        estimatedCost: String(initialData.estimatedCost || ''),
      })
    }
  }, [initialData])

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-for-damage'],
    queryFn: async () => {
      const response = await api.get('/bookings', { params: { status: 'CHECKED_OUT', limit: 100 } })
      return response.data
    },
    enabled: !initialData,
  })

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (initialData?.id) {
        await api.patch(`/damages/${initialData.id}`, data)
      } else {
        await api.post('/damages', data)
      }
    },
    onSuccess: () => {
      toast({ title: initialData?.id ? tc('saveSuccess') || 'Saved' : t('createSuccess') })
      queryClient.invalidateQueries({ queryKey: ['damages'] })
      onSuccess?.()
    },
    onError: () => {
      toast({ title: tc('error') || 'Error', variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bookingId || !formData.description || !formData.estimatedCost) {
      toast({ title: t('requiredFields'), variant: 'destructive' })
      return
    }
    mutation.mutate(formData)
  }

  const handleBookingSelect = (bookingId: string) => {
    const booking = (bookingsData?.bookings || []).find((b: Booking) => b.id === bookingId)
    if (booking) {
      setFormData({ ...formData, bookingId, vehicleId: booking.vehicle.id })
    }
  }

  const filteredBookings = (bookingsData?.bookings || []).filter((b: Booking) =>
    `${b.customer.firstName} ${b.customer.lastName} ${b.vehicle.brand} ${b.vehicle.model} ${b.vehicle.licensePlate}`
      .toLowerCase().includes(bookingSearch.toLowerCase())
  )

  const selectedBooking = (bookingsData?.bookings || []).find((b: Booking) => b.id === formData.bookingId) || initialData?.booking

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="booking">{t('selectBooking')} <span className="text-red-500">*</span></Label>
        <Select
          value={formData.bookingId}
          onValueChange={handleBookingSelect}
          disabled={!!initialData}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('selectBooking')}>
              {selectedBooking 
                ? `${selectedBooking.customer?.firstName} ${selectedBooking.customer?.lastName} - ${selectedBooking.vehicle?.licensePlate}`
                : t('selectBooking')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {!initialData && (
              <div className="p-2">
                <Input
                  placeholder={t('searchBooking')}
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="mb-2"
                />
              </div>
            )}
            <div className="max-h-[200px] overflow-y-auto">
              {initialData ? (
                 <SelectItem key={selectedBooking?.id} value={selectedBooking?.id || ''}>
                    {selectedBooking?.customer?.firstName} {selectedBooking?.customer?.lastName} - {selectedBooking?.vehicle?.brand} {selectedBooking?.vehicle?.model} ({selectedBooking?.vehicle?.licensePlate})
                 </SelectItem>
              ) : (
                filteredBookings.map((booking: Booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.customer.firstName} {booking.customer.lastName} - {booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.licensePlate})
                    </SelectItem>
                  ))
              )}
            </div>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="severity">{t('severityLabel')} <span className="text-red-500">*</span></Label>
          <Select
            value={formData.severity}
            onValueChange={(value) => setFormData({ ...formData, severity: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="type">{t('damageType')} <span className="text-red-500">*</span></Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAMAGE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="position">{t('position')} <span className="text-red-500">*</span></Label>
          <Select
            value={formData.position}
            onValueChange={(value) => setFormData({ ...formData, position: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="estimatedCost">{t('estimatedCost')} <span className="text-red-500">*</span></Label>
          <Input
            id="estimatedCost"
            type="number"
            min="0"
            step="0.01"
            value={formData.estimatedCost}
            onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
            placeholder="100.00"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">{tc('description')} <span className="text-red-500">*</span></Label>
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
