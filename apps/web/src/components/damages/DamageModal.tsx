'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { DamageForm } from './DamageForm'
import { useTranslations } from 'next-intl'

interface DamageModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
}

export function DamageModal({ isOpen, onClose, initialData }: DamageModalProps) {
  const t = useTranslations('Damages')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `${tc('edit')} ${t('title')}` : t('addDamage')}
          </DialogTitle>
          <DialogDescription>
            {initialData ? t('editDamageDesc') || 'Edit the damage report details.' : t('addDamageDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <DamageForm 
            initialData={initialData} 
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
