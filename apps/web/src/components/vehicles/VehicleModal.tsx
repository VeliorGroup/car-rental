'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { VehicleForm } from './VehicleForm'
import { useTranslations } from 'next-intl'

interface VehicleModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
}

export function VehicleModal({ isOpen, onClose, initialData }: VehicleModalProps) {
  const t = useTranslations('Vehicles')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `${tc('edit')} ${t('vehicle')}` : t('addVehicle')}
          </DialogTitle>
          <DialogDescription>
            {initialData ? t('updateVehicleDesc') : t('addVehicleDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <VehicleForm 
            initialData={initialData} 
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
