'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BookingForm } from './BookingForm'
import { useTranslations } from 'next-intl'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
  bookingId?: string
  mode?: 'create' | 'edit'
}

export function BookingModal({ isOpen, onClose, initialData, bookingId, mode = 'create' }: BookingModalProps) {
  const t = useTranslations('Bookings')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? `${tc('edit')} ${t('booking')}` : t('addBooking') || 'New Booking'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? t('updateBookingDesc') : t('addBookingDesc') || 'Fill in the details to create a new booking.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <BookingForm 
            initialData={initialData} 
            bookingId={bookingId}
            mode={mode}
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
