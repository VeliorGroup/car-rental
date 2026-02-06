'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TireForm } from './TireForm'
import { useTranslations } from 'next-intl'

interface TireModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
}

export function TireModal({ isOpen, onClose, initialData }: TireModalProps) {
  const t = useTranslations('Tires')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `${tc('edit')} ${t('title')}` : t('addTire')}
          </DialogTitle>
          <DialogDescription>
            {initialData ? t('editTireDesc') || 'Edit tire details.' : t('addTireDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <TireForm 
            initialData={initialData} 
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
