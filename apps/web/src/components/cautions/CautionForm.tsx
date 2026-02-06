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

interface Booking {
  id: string
  customer: {
    firstName: string
    lastName: string
  }
  vehicle: {
    brand: string
    model: string
    licensePlate: string
  }
}

interface CautionFormProps {
  initialData?: Record<string, unknown>
  onSuccess?: () => void
  onCancel?: () => void
}

export function CautionForm({ initialData, onSuccess, onCancel }: CautionFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const t = useTranslations('Cautions')
  const tc = useTranslations('Common')
  
  const [bookingSearch, setBookingSearch] = useState('')
  const [formData, setFormData] = useState({
    bookingId: '',
    amount: '',
    paymentMethod: 'CASH',
    status: 'HELD',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        bookingId: initialData.bookingId || initialData.booking?.id || '',
        amount: String(initialData.amount || ''),
        paymentMethod: initialData.paymentMethod || 'CASH',
        status: initialData.status || 'HELD',
      })
    }
  }, [initialData])

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-for-caution'],
    queryFn: async () => {
      const response = await api.get('/bookings', { params: { status: 'CHECKED_OUT', limit: 100 } })
      return response.data
    },
    enabled: !initialData,
  })

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
      }
      if (initialData?.id) {
        await api.patch(`/cautions/${initialData.id}`, payload)
      } else {
        await api.post('/cautions', payload)
      }
    },
    onSuccess: () => {
      toast({ title: initialData?.id ? tc('saveSuccess') || 'Saved' : t('createSuccess') })
      queryClient.invalidateQueries({ queryKey: ['cautions'] })
      onSuccess?.()
    },
    onError: () => {
      toast({ title: tc('error') || 'Error', variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bookingId || !formData.amount) {
      toast({ title: t('requiredFields'), variant: 'destructive' })
      return
    }
    mutation.mutate(formData)
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
          onValueChange={(value) => setFormData({ ...formData, bookingId: value })}
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
          <Label htmlFor="amount">{tc('amount')} <span className="text-red-500">*</span></Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="500.00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="paymentMethod">{t('paymentMethod')} <span className="text-red-500">*</span></Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="CASH">{t('paymentMethods.cash') || 'Cash'}</SelectItem>
                <SelectItem value="BANK_TRANSFER">{t('paymentMethods.bankTransfer') || 'Bank Transfer'}</SelectItem>
                <SelectItem value="PAYSERA">{t('paymentMethods.paysera') || 'Paysera'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {initialData && (
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
                <SelectItem value="HELD">{t('status.held')}</SelectItem>
                <SelectItem value="RELEASED">{t('status.released')}</SelectItem>
                <SelectItem value="CHARGED">{t('status.charged')}</SelectItem>
                <SelectItem value="PARTIALLY_CHARGED">{t('status.partiallyCharged')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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
